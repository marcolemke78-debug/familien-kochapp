import { describe, it, expect } from "vitest";
import { detectImageType, isPhotoKey, MAX_PHOTO_BYTES } from "./photos";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("detectImageType", () => {
  it("erkennt JPEG, PNG und WebP an den ersten Bytes", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({ type: "image/jpeg", ext: "jpg" });
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({ type: "image/png", ext: "png" });
    expect(detectImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))).toEqual({ type: "image/webp", ext: "webp" });
  });

  it("lehnt alles andere ab, auch wenn der Dateiname nach Bild aussieht", () => {
    expect(detectImageType(bytes(...ascii("<svg")))).toBeNull();
    expect(detectImageType(bytes(...ascii("%PDF")))).toBeNull();
    expect(detectImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("isPhotoKey", () => {
  it("lässt nur selbst erzeugte Dateinamen zu", () => {
    expect(isPhotoKey("1b4e28ba-2fa1-4d3b-a3f5-ef19b5a7633b.jpg")).toBe(true);
    expect(isPhotoKey("../users.sql")).toBe(false);
    expect(isPhotoKey("1b4e28ba-2fa1-4d3b-a3f5-ef19b5a7633b.svg")).toBe(false);
    expect(isPhotoKey("")).toBe(false);
  });
});

describe("MAX_PHOTO_BYTES", () => {
  it("liegt bei 5 MB (verkleinerte Fotos sind meist unter 1 MB)", () => {
    expect(MAX_PHOTO_BYTES).toBe(5 * 1024 * 1024);
  });
});
