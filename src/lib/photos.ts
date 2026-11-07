// Rezeptfotos in R2 (Bucket "familien-kochapp-fotos", EU).
// Der Browser verkleinert jedes Foto vorher auf 1600 px (src/lib/resize-image.ts).
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

type ImageType = { type: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

// Erkennt das Format an den ersten Bytes ("Magic Bytes") statt am Dateinamen,
// damit niemand z. B. eine SVG- oder HTML-Datei als "Foto" einschmuggeln kann.
export function detectImageType(head: Uint8Array): ImageType | null {
  if (head.length < 12) return null;
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return { type: "image/png", ext: "png" };
  const text = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return { type: "image/webp", ext: "webp" };
  return null;
}

const KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export function isPhotoKey(key: string): boolean {
  return KEY.test(key);
}

async function bucket() {
  const { env } = await getCloudflareContext({ async: true });
  return env.PHOTOS;
}

export async function storePhoto(file: File): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "Das Foto ist zu groß (höchstens 5 MB nach dem Verkleinern)." };
  const data = new Uint8Array(await file.arrayBuffer());
  const kind = detectImageType(data.subarray(0, 16));
  if (!kind) return { ok: false, error: "Bitte ein Foto als JPEG, PNG, WebP oder HEIC wählen." };

  const key = `${crypto.randomUUID()}.${kind.ext}`;
  await (await bucket()).put(key, data, { httpMetadata: { contentType: kind.type } });
  return { ok: true, key };
}

export async function deletePhoto(key: string | null | undefined): Promise<void> {
  if (!key || !isPhotoKey(key)) return;
  try {
    await (await bucket()).delete(key);
  } catch {
    // Ein verwaistes Foto ist harmlos; das Rezept selbst ist dann schon gespeichert/gelöscht.
  }
}

export async function getPhoto(key: string) {
  return (await bucket()).get(key);
}
