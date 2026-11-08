import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Clock, ExternalLink, Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getRecipe, getVariantSteps } from "@/lib/recipes";
import { DEVICES, tagLabel } from "@/lib/recipe-meta";
import { formatSettings } from "@/lib/convert";
import { DeviceConverter } from "@/components/device-converter";
import { cn } from "@/lib/utils";
import { parseRecipeId } from "@/lib/recipe-input";
import { NoAccess } from "@/components/no-access";
import { RecipePhoto } from "@/components/recipe-photo";
import { DeviceBadge } from "@/components/device-badge";
import { ScaledIngredients } from "@/components/scaled-ingredients";
import { checkIngredient, ingredientKey, markIngredients } from "@/lib/allergens";
import { formatIngredient } from "@/lib/ingredients";
import { SubstituteSheet, type SubstituteIngredient } from "@/components/substitute-sheet";
import { listApprovedSubstitutions, listFamilyNames, listRules } from "@/lib/allergen-store";
import { MarkTestedButton } from "@/components/mark-tested-button";
import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { formatMinutes } from "@/components/recipe-card";
import { buttonVariants } from "@/components/ui/button";
import { NutritionCard } from "@/components/nutrition-card";
import { applySubstitutions, computeNutrition } from "@/lib/nutrition";
import { listMappings } from "@/lib/nutrition-store";

export const metadata: Metadata = { title: "Rezept · Familienkochbuch" };

export default async function RecipePage({ params, searchParams }: PageProps<"/rezepte/[id]">) {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  const id = parseRecipeId((await params).id);
  const recipe = id === null ? null : await getRecipe(id);
  if (!recipe) notFound();

  // Spec 05: Original oder Geräte-Variante anzeigen (?geraet=tm6 / airfryer)
  const requested = (await searchParams).geraet;
  const variants = recipe.devices.filter((d) => d.convertedAt);
  const active = variants.find((d) => d.device === requested) ?? null;
  const activeSteps = active ? await getVariantSteps(recipe.id, active.device) : null;
  const activeLabel = active ? DEVICES.find((d) => d.value === active.device)?.label : null;
  // Beide Zeitstempel sind "JJJJ-MM-TT HH:MM:SS" aus SQLite, darum als Text vergleichbar
  const originalChanged = !!active?.convertedAt && recipe.updatedAt > active.convertedAt;
  // Spec 06: Allergie-Markierungen der ganzen Familie
  const [rules, approved, names, nutritionMappings] = await Promise.all([
    listRules(),
    listApprovedSubstitutions(recipe.id),
    listFamilyNames(),
    listMappings(),
  ]);
  // Spec 07: Nährwerte frisch aus Zutaten und Zuordnungen, freigegebener Ersatz gilt für den ganzen Topf
  const withSubstitutes = applySubstitutions(recipe.ingredients, approved);
  const nutrition = computeNutrition(withSubstitutes.ingredients, nutritionMappings, recipe.servings);
  const marks = rules.length > 0 || approved.length > 0 ? markIngredients(recipe.ingredients, rules, approved, names) : [];
  // Für "Diese Zutaten besser nicht": eigene Treffer vorauswählen, eigenen Ersatz anzeigen
  const myRules = rules.filter((r) => r.userId === user.id);
  const substituteIngredients: SubstituteIngredient[] = recipe.ingredients.flatMap((ing, position) =>
    ing.heading
      ? []
      : [
          {
            position,
            name: ing.name,
            line: formatIngredient(ing),
            mine: checkIngredient(ing.name, ing.raw ?? null, myRules).length > 0,
            myReplacement: approved.find((s) => s.userId === user.id && s.ingredientKey === ingredientKey(ing.name))?.replacement ?? null,
          },
        ],
  );
  const convertible = DEVICES.filter((d) => !recipe.devices.some((x) => x.device === d.value));

  const hostname = recipe.sourceUrl ? new URL(recipe.sourceUrl).hostname.replace(/^www\./, "") : null;

  return (
    <article className="pt-4 sm:pt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-3",
          })}
        >
          <ArrowLeft aria-hidden />
          Alle Rezepte
        </Link>
        <div className="flex gap-2">
          <Link href={`/rezepte/${recipe.id}/bearbeiten`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Pencil aria-hidden />
            Bearbeiten
          </Link>
          <DeleteRecipeButton recipeId={recipe.id} title={recipe.title} />
        </div>
      </div>

      <RecipePhoto
        photoKey={recipe.photoKey}
        alt={recipe.title}
        priority
        className="aspect-[4/3] w-full rounded-[1.25rem] shadow-float sm:aspect-[16/9] lg:aspect-[21/9]"
      />

      <header className="mt-6 space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{recipe.title}</h1>
        {recipe.description && <p className="max-w-2xl text-lg whitespace-pre-line text-muted-foreground">{recipe.description}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {recipe.prepMinutes !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium">
              <Clock className="size-4" aria-hidden />
              {formatMinutes(recipe.prepMinutes)}
            </span>
          )}
          {recipe.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
              {tagLabel(tag)}
            </span>
          ))}
        </div>
      </header>

      {recipe.devices.length > 0 && (
        <section aria-label="Geräte" className="mt-6 grid gap-3 sm:grid-cols-2">
          {recipe.devices.map((d) => (
            <div key={d.device} className="flex flex-col gap-3 rounded-[1.25rem] border border-border bg-card p-4">
              <DeviceBadge device={d.device} status={d.status} showStatus className="self-start shadow-none" />
              {d.hint && <p className="text-base">{d.hint}</p>}
              {d.status !== "getestet" && <MarkTestedButton recipeId={recipe.id} device={d.device} />}
            </div>
          ))}
        </section>
      )}

      {/* KI-Umrechnung: neue Geräte-Versionen und "neu umrechnen" für vorhandene KI-Versionen */}
      {(convertible.length > 0 || variants.length > 0) && (
        <section aria-label="Mit KI umrechnen" className="mt-4 flex flex-wrap gap-3">
          {convertible.map((d) => (
            <DeviceConverter key={d.value} recipeId={recipe.id} device={d.value} />
          ))}
          {variants.map((d) => (
            <DeviceConverter key={d.device} recipeId={recipe.id} device={d.device} again tested={d.status === "getestet"} />
          ))}
        </section>
      )}

      {variants.length > 0 && (
        <nav aria-label="Version wählen" className="mt-10 flex flex-wrap gap-2">
          {[{ href: `/rezepte/${recipe.id}`, label: "Original", current: !active }]
            .concat(
              variants.map((d) => ({
                href: `/rezepte/${recipe.id}?geraet=${d.device}`,
                label: DEVICES.find((x) => x.value === d.device)?.short ?? d.device,
                current: active?.device === d.device,
              })),
            )
            .map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                replace
                scroll={false}
                aria-current={tab.current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-5 text-base font-semibold transition-all duration-150 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]",
                  tab.current
                    ? "border-transparent bg-linear-to-r from-primary to-brand-deep text-primary-foreground shadow-float"
                    : "border-border bg-card hover:border-foreground/40",
                )}
              >
                {tab.label}
              </Link>
            ))}
        </nav>
      )}

      <div className={cn("grid gap-10", variants.length > 0 ? "mt-6" : "mt-10", "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12")}>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ScaledIngredients ingredients={recipe.ingredients} baseServings={recipe.servings} marks={marks} />
          <div className="mt-4">
            <SubstituteSheet recipeId={recipe.id} ingredients={substituteIngredients} />
          </div>
          <div className="mt-6">
            <NutritionCard recipeId={recipe.id} result={nutrition} replaced={withSubstitutes.replaced} />
          </div>
        </div>

        <section aria-labelledby="zubereitung" className="space-y-5">
          <div className="space-y-3">
            <h2 id="zubereitung" className="text-2xl font-semibold tracking-tight">
              {activeLabel ? `Zubereitung mit ${activeLabel}` : "Zubereitung"}
            </h2>
            {active && <DeviceBadge device={active.device} status={active.status} showStatus className="shadow-none" />}
            {originalChanged && (
              <p className="flex items-start gap-2 rounded-2xl border border-[#8a5a00]/30 bg-[#f0c060]/15 p-3 text-sm font-medium text-[#8a5a00] dark:text-[#f0c060]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                Das Original wurde nach der Umrechnung geändert. Bitte prüfen oder neu umrechnen.
              </p>
            )}
          </div>
          {activeSteps && active ? (
            <ol className="space-y-6">
              {activeSteps.map((step, index) => (
                <li key={index} className="flex gap-4">
                  <span
                    aria-hidden
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand to-brand-deep text-lg font-semibold text-primary-foreground"
                  >
                    {index + 1}
                  </span>
                  <div className="space-y-2 pt-1.5">
                    {step.settings && (
                      <p className="inline-flex rounded-xl bg-secondary px-3 py-1 text-base font-semibold tabular-nums">
                        {formatSettings(active.device, step.settings)}
                      </p>
                    )}
                    <p className="text-xl leading-relaxed whitespace-pre-line">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="space-y-6">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex gap-4">
                  <span
                    aria-hidden
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand to-brand-deep text-lg font-semibold text-primary-foreground"
                  >
                    {index + 1}
                  </span>
                  <p className="pt-1.5 text-xl leading-relaxed whitespace-pre-line">{step}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {(recipe.sourceNote || (recipe.sourceUrl && hostname)) && (
        <p className="mt-12 border-t border-border pt-6 text-muted-foreground">
          Quelle: {recipe.sourceNote}
          {recipe.sourceNote && recipe.sourceUrl && hostname && " · "}
          {recipe.sourceUrl && hostname && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex min-h-11 items-center gap-1 rounded-md font-medium text-primary underline-offset-4 transition-colors duration-150 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {hostname}
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
        </p>
      )}
    </article>
  );
}
