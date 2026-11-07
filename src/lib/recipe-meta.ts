// Feste Auswahllisten für Rezepte. Die Werte stehen so auch in den CHECK-Regeln von migrations/0002_recipes.sql.

export const MEALS = [
  { value: "fruehstueck", label: "Frühstück" },
  { value: "hauptmahlzeit", label: "Hauptmahlzeit" },
  { value: "abend", label: "Abend" },
  { value: "zwischendurch", label: "Zwischendurch" },
  { value: "backen", label: "Kuchen und Backen" },
] as const;

export const TRAITS = [
  { value: "schnell", label: "Schnell" },
  { value: "guenstig", label: "Günstig" },
  { value: "vorbereiten", label: "Gut vorzubereiten" },
] as const;

export const TAG_VALUES = [...MEALS, ...TRAITS].map((t) => t.value);
export type Tag = (typeof MEALS)[number]["value"] | (typeof TRAITS)[number]["value"];

export const DEVICES = [
  { value: "tm6", label: "Thermomix TM6", short: "TM6", hintPlaceholder: "z. B. 20 Min. / 100 °C / Stufe 1" },
  { value: "airfryer", label: "Heißluftfritteuse", short: "Heißluft", hintPlaceholder: "z. B. 15 Min. bei 180 °C" },
] as const;
export type Device = (typeof DEVICES)[number]["value"];

export const DEVICE_STATUS = {
  original: "Originalrezept",
  ki: "KI-Vorschlag",
  getestet: "getestet",
} as const;
export type DeviceStatus = keyof typeof DEVICE_STATUS;

export function tagLabel(value: string): string {
  return [...MEALS, ...TRAITS].find((t) => t.value === value)?.label ?? value;
}

export function deviceShort(value: string): string {
  return DEVICES.find((d) => d.value === value)?.short ?? value;
}
