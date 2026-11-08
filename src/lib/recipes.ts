// Datenzugriff auf D1 für Rezepte.
// Zutaten, Schritte, Kategorien und Geräte gehen jeweils als EIN JSON-Text in EINE Abfrage
// (json_each packt ihn in SQLite aus). So bleibt ein Rezept unter den D1-Grenzen
// (50 Abfragen pro Aufruf, 100 Parameter pro Abfrage), egal wie viele Zutaten es hat.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Ingredient } from "./ingredients";
import type { Variant, VariantStep } from "./convert";
import type { Combo } from "./combo";
import type { RecipeInput } from "./recipe-input";
import { DEVICES, type Device, type DeviceStatus, type Tag } from "./recipe-meta";
import { buildFilterSql, EMPTY_FILTERS, type Filters } from "./recipe-query";

// convertedAt gesetzt = es gibt eine KI-Variante mit eigenen Schritten (Spec 05)
export type RecipeDevice = { device: Device; status: DeviceStatus; hint: string | null; convertedAt: string | null };

export type RecipeSummary = {
  id: number;
  title: string;
  servings: number;
  prepMinutes: number | null;
  photoKey: string | null;
  devices: RecipeDevice[];
};

export type Recipe = RecipeSummary & {
  clientId: string;
  updatedAt: string;
  description: string | null;
  sourceUrl: string | null;
  sourceNote: string | null;
  tags: Tag[];
  ingredients: Ingredient[];
  steps: string[];
};

type RecipeRow = {
  id: number;
  client_id: string;
  title: string;
  description: string | null;
  servings: number;
  prep_minutes: number | null;
  source_url: string | null;
  source_note: string | null;
  updated_at?: string;
  photo_key: string | null;
  devices: string | null;
};

type IngredientRow = {
  quantity: number | null;
  quantity_max: number | null;
  unit: string | null;
  name: string;
  is_heading: number;
  is_raw: number | null;
};

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

// Geräte kommen als JSON-Text aus der Abfrage (json_group_array)
function parseDevices(json: string | null): RecipeDevice[] {
  if (!json) return [];
  const order = DEVICES.map((d) => d.value as string);
  const list = JSON.parse(json) as RecipeDevice[];
  return list.filter((d) => d && d.device).sort((a, b) => order.indexOf(a.device) - order.indexOf(b.device)); // TM6 zuerst
}

const DEVICES_JSON = `(SELECT json_group_array(json_object('device', d.device, 'status', d.status, 'hint', d.hint, 'convertedAt', d.converted_at))
  FROM recipe_devices d WHERE d.recipe_id = r.id) AS devices`;

export async function listRecipes(filters: Filters = EMPTY_FILTERS): Promise<RecipeSummary[]> {
  const { where, params } = buildFilterSql(filters); // nur feste SQL-Bausteine, Nutzertext in params
  const { results } = await (await db())
    .prepare(
      `SELECT r.id, r.title, r.servings, r.prep_minutes, r.photo_key, ${DEVICES_JSON}
       FROM recipes r ${where} ORDER BY r.created_at DESC, r.id DESC`,
    )
    .bind(...params)
    .all<RecipeRow>();
  return results.map((r) => ({
    id: r.id,
    title: r.title,
    servings: r.servings,
    prepMinutes: r.prep_minutes,
    photoKey: r.photo_key,
    devices: parseDevices(r.devices),
  }));
}

export async function getRecipe(id: number): Promise<Recipe | null> {
  const database = await db();
  const [recipe, ingredients, steps, tags] = await database.batch([
    database.prepare(`SELECT r.*, ${DEVICES_JSON} FROM recipes r WHERE r.id = ?1`).bind(id),
    database
      .prepare(`SELECT quantity, quantity_max, unit, name, is_heading, is_raw FROM ingredients WHERE recipe_id = ?1 ORDER BY position`)
      .bind(id),
    database.prepare(`SELECT text FROM steps WHERE recipe_id = ?1 ORDER BY position`).bind(id),
    database.prepare(`SELECT tag FROM recipe_tags WHERE recipe_id = ?1`).bind(id),
  ]);
  const r = (recipe.results as RecipeRow[])[0];
  if (!r) return null;
  return {
    id: r.id,
    clientId: r.client_id,
    updatedAt: r.updated_at ?? "",
    title: r.title,
    description: r.description,
    servings: r.servings,
    prepMinutes: r.prep_minutes,
    sourceUrl: r.source_url,
    sourceNote: r.source_note,
    photoKey: r.photo_key,
    devices: parseDevices(r.devices),
    tags: (tags.results as { tag: Tag }[]).map((t) => t.tag),
    ingredients: (ingredients.results as IngredientRow[]).map((i) => ({
      quantity: i.quantity,
      quantityMax: i.quantity_max,
      unit: i.unit,
      name: i.name,
      ...(i.is_heading === 1 && { heading: true as const }),
      ...(i.is_raw !== null && { raw: i.is_raw === 1 }),
    })),
    steps: (steps.results as { text: string }[]).map((s) => s.text),
  };
}

export async function findRecipeIdByClientId(clientId: string): Promise<number | null> {
  const row = await (await db()).prepare(`SELECT id FROM recipes WHERE client_id = ?1`).bind(clientId).first<{ id: number }>();
  return row?.id ?? null;
}

export async function getPhotoKey(id: number): Promise<{ exists: boolean; photoKey: string | null }> {
  const row = await (await db()).prepare(`SELECT photo_key FROM recipes WHERE id = ?1`).bind(id).first<{ photo_key: string | null }>();
  return { exists: row !== null, photoKey: row?.photo_key ?? null };
}

// Kind-Tabellen neu schreiben. `idSql` ist entweder "?1" (Rezept-ID) oder eine Unterabfrage über client_id.
function childStatements(database: D1Database, idSql: string, idParam: number | string, input: RecipeInput) {
  const ingredients = JSON.stringify(input.ingredients);
  const steps = JSON.stringify(input.steps);
  const tags = JSON.stringify(input.tags);
  const devices = JSON.stringify(input.devices);
  return [
    database.prepare(`DELETE FROM ingredients WHERE recipe_id = ${idSql}`).bind(idParam),
    database
      .prepare(
        // JSON true/false liefert json_extract als 1/0, fehlendes "raw" als NULL (= unbekannt)
        `INSERT INTO ingredients (recipe_id, position, quantity, quantity_max, unit, name, is_heading, is_raw)
         SELECT ${idSql}, j.key, json_extract(j.value, '$.quantity'), json_extract(j.value, '$.quantityMax'),
                json_extract(j.value, '$.unit'), json_extract(j.value, '$.name'),
                coalesce(json_extract(j.value, '$.heading'), 0), json_extract(j.value, '$.raw')
         FROM json_each(?2) j`,
      )
      .bind(idParam, ingredients),
    database.prepare(`DELETE FROM steps WHERE recipe_id = ${idSql}`).bind(idParam),
    database
      .prepare(`INSERT INTO steps (recipe_id, position, text) SELECT ${idSql}, j.key, j.value FROM json_each(?2) j`)
      .bind(idParam, steps),
    database.prepare(`DELETE FROM recipe_tags WHERE recipe_id = ${idSql}`).bind(idParam),
    database
      .prepare(`INSERT INTO recipe_tags (recipe_id, tag) SELECT ${idSql}, j.value FROM json_each(?2) j`)
      .bind(idParam, tags),
    // Geräte: abgewählte entfernen, neue mit Status "original" anlegen,
    // bei vorhandenen nur den Hinweis ändern (ein "getestet" bleibt erhalten)
    database
      .prepare(
        `DELETE FROM recipe_devices WHERE recipe_id = ${idSql}
         AND device NOT IN (SELECT json_extract(value, '$.device') FROM json_each(?2))`,
      )
      .bind(idParam, devices),
    database
      .prepare(
        `INSERT INTO recipe_devices (recipe_id, device, hint)
         SELECT ${idSql}, json_extract(j.value, '$.device'), json_extract(j.value, '$.hint') FROM json_each(?2) j
         WHERE true
         ON CONFLICT (recipe_id, device) DO UPDATE SET hint = excluded.hint`,
      )
      .bind(idParam, devices),
  ];
}

// Legt ein Rezept in EINER Transaktion an (batch = alles oder nichts)
export async function createRecipe(input: RecipeInput, userId: number, photoKey: string | null): Promise<number> {
  const database = await db();
  const byClientId = "(SELECT id FROM recipes WHERE client_id = ?1)";
  await database.batch([
    database
      .prepare(
        `INSERT INTO recipes (client_id, title, description, servings, prep_minutes, source_url, source_note, photo_key, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      )
      .bind(input.clientId, input.title, input.description, input.servings, input.prepMinutes, input.sourceUrl, input.sourceNote, photoKey, userId),
    ...childStatements(database, byClientId, input.clientId, input),
  ]);
  const id = await findRecipeIdByClientId(input.clientId);
  if (id === null) throw new Error("Rezept nach dem Anlegen nicht gefunden");
  return id;
}

// photoKey: undefined = Foto bleibt, null = Foto entfernen, string = neues Foto
export async function updateRecipe(id: number, input: RecipeInput, photoKey: string | null | undefined): Promise<void> {
  const database = await db();
  const fields = `title = ?2, description = ?3, servings = ?4, prep_minutes = ?5, source_url = ?6, source_note = ?7, updated_at = datetime('now')`;
  const values = [id, input.title, input.description, input.servings, input.prepMinutes, input.sourceUrl, input.sourceNote] as const;
  const update =
    photoKey === undefined
      ? database.prepare(`UPDATE recipes SET ${fields} WHERE id = ?1`).bind(...values)
      : database.prepare(`UPDATE recipes SET ${fields}, photo_key = ?8 WHERE id = ?1`).bind(...values, photoKey);
  await database.batch([update, ...childStatements(database, "?1", id, input)]);
}

// Löscht das Rezept (Zutaten usw. per ON DELETE CASCADE) und liefert den Foto-Schlüssel zum Aufräumen
export async function deleteRecipe(id: number): Promise<{ deleted: boolean; photoKey: string | null }> {
  const row = await (await db())
    .prepare(`DELETE FROM recipes WHERE id = ?1 RETURNING photo_key`)
    .bind(id)
    .first<{ photo_key: string | null }>();
  return { deleted: row !== null, photoKey: row?.photo_key ?? null };
}

export async function markDeviceTested(id: number, device: Device): Promise<boolean> {
  const result = await (await db())
    .prepare(`UPDATE recipe_devices SET status = 'getestet' WHERE recipe_id = ?1 AND device = ?2`)
    .bind(id, device)
    .run();
  return result.meta.changes > 0;
}

// --- Geräte-Varianten (Spec 05) ---------------------------------------------

export async function getVariantSteps(id: number, device: Device): Promise<VariantStep[]> {
  const { results } = await (await db())
    .prepare(`SELECT text, settings FROM device_steps WHERE recipe_id = ?1 AND device = ?2 ORDER BY position`)
    .bind(id, device)
    .all<{ text: string; settings: string | null }>();
  return results.map((r) => ({ text: r.text, settings: r.settings ? JSON.parse(r.settings) : null }));
}

export async function getDeviceRow(id: number, device: Device) {
  return (await db())
    .prepare(`SELECT status, converted_at FROM recipe_devices WHERE recipe_id = ?1 AND device = ?2`)
    .bind(id, device)
    .first<{ status: DeviceStatus; converted_at: string | null }>();
}

// Speichert die Variante in EINER Transaktion: Status "ki", Hinweis, Zeitpunkt, Schritte neu.
// Ob überschrieben werden darf, prüft die Server Action vorher (getDeviceRow).
export async function saveVariant(id: number, device: Device, variant: Variant): Promise<void> {
  const database = await db();
  await database.batch([
    database
      .prepare(
        `INSERT INTO recipe_devices (recipe_id, device, status, hint, converted_at)
         VALUES (?1, ?2, 'ki', ?3, datetime('now'))
         ON CONFLICT (recipe_id, device) DO UPDATE SET status = 'ki', hint = excluded.hint, converted_at = excluded.converted_at`,
      )
      .bind(id, device, variant.hint || null),
    database.prepare(`DELETE FROM device_steps WHERE recipe_id = ?1 AND device = ?2`).bind(id, device),
    database
      .prepare(
        `INSERT INTO device_steps (recipe_id, device, position, text, settings)
         SELECT ?1, ?2, j.key, json_extract(j.value, '$.text'), json_extract(j.value, '$.settings')
         FROM json_each(?3) j`,
      )
      .bind(id, device, JSON.stringify(variant.steps)),
  ]);
}

// --- TM6 und Heißluft zusammen (Spec 10) -------------------------------------

export type ComboPlan = Combo & { status: "ki" | "getestet"; convertedAt: string };

export async function getCombo(id: number): Promise<ComboPlan | null> {
  const database = await db();
  const [plan, steps] = await database.batch([
    database.prepare(`SELECT status, benefit, converted_at FROM combo_plans WHERE recipe_id = ?1`).bind(id),
    database.prepare(`SELECT text, device, settings, parallel FROM combo_steps WHERE recipe_id = ?1 ORDER BY position`).bind(id),
  ]);
  const p = (plan.results as { status: "ki" | "getestet"; benefit: string; converted_at: string }[])[0];
  if (!p) return null;
  return {
    status: p.status,
    benefit: p.benefit,
    convertedAt: p.converted_at,
    steps: (steps.results as { text: string; device: Device | null; settings: string | null; parallel: number }[]).map((s) => ({
      text: s.text,
      device: s.device,
      settings: s.settings ? JSON.parse(s.settings) : null,
      parallel: s.parallel === 1,
    })),
  };
}

export async function getComboStatus(id: number): Promise<"ki" | "getestet" | null> {
  const row = await (await db()).prepare(`SELECT status FROM combo_plans WHERE recipe_id = ?1`).bind(id).first<{ status: "ki" | "getestet" }>();
  return row?.status ?? null;
}

// Speichert die Kombi in EINER Transaktion: Status "ki", Nutzen, Zeitpunkt, Schritte neu.
// Ob überschrieben werden darf, prüft die Server Action vorher (getComboStatus).
export async function saveCombo(id: number, combo: Combo): Promise<void> {
  const database = await db();
  await database.batch([
    database
      .prepare(
        `INSERT INTO combo_plans (recipe_id, status, benefit, converted_at) VALUES (?1, 'ki', ?2, datetime('now'))
         ON CONFLICT (recipe_id) DO UPDATE SET status = 'ki', benefit = excluded.benefit, converted_at = excluded.converted_at`,
      )
      .bind(id, combo.benefit),
    database.prepare(`DELETE FROM combo_steps WHERE recipe_id = ?1`).bind(id),
    database
      .prepare(
        // json_extract liefert true/false als 1/0
        `INSERT INTO combo_steps (recipe_id, position, text, device, settings, parallel)
         SELECT ?1, j.key, json_extract(j.value, '$.text'), json_extract(j.value, '$.device'),
                json_extract(j.value, '$.settings'), json_extract(j.value, '$.parallel')
         FROM json_each(?2) j`,
      )
      .bind(id, JSON.stringify(combo.steps)),
  ]);
}

export async function markComboTested(id: number): Promise<boolean> {
  const result = await (await db()).prepare(`UPDATE combo_plans SET status = 'getestet' WHERE recipe_id = ?1`).bind(id).run();
  return result.meta.changes > 0;
}
