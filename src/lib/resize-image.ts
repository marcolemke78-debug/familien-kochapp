// Nur im Browser: verkleinert ein Foto auf höchstens 1600 px an der langen Kante und speichert es als JPEG.
// So wird aus einem 6-MB-Handyfoto (auch HEIC vom iPhone) eine Datei mit meist unter 500 KB.

export const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_EDGE = 1600;

export function checkOriginal(file: File): string | null {
  // Manche Browser kennen den Typ von HEIC nicht (leer) -> dann an der Endung erkennen
  const typeOk = ACCEPTED_TYPES.includes(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!typeOk) return "Bitte ein Foto als JPEG, PNG, WebP oder HEIC wählen.";
  if (file.size > MAX_ORIGINAL_BYTES) return "Das Foto ist größer als 10 MB. Bitte ein kleineres wählen.";
  return null;
}

export async function resizeImage(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // scheitert, wenn der Browser das Format nicht kann (z. B. HEIC in Chrome)

    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas nicht verfügbar");
    ctx.fillStyle = "#fdfcfb"; // transparente PNGs bekommen einen hellen statt schwarzen Hintergrund
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) throw new Error("JPEG konnte nicht erzeugt werden");
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
