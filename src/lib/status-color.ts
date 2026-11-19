import { contrastText, mixHex, sanitizeHex } from "@/lib/home-prefs";

export const STATUS_COLOR_PRESETS = [
  { id: "teal", label: "Teal", hex: "#2f9d90" },
  { id: "sage", label: "Sage", hex: "#4cae6e" },
  { id: "amber", label: "Amber", hex: "#e0a12e" },
  { id: "rose", label: "Rose", hex: "#d45d66" },
  { id: "blue", label: "Blue", hex: "#4a93c4" },
  { id: "plum", label: "Plum", hex: "#8a6fad" },
  { id: "navy", label: "Navy", hex: "#2c6b78" },
] as const;

export function namedStatusHex(name: string | undefined): string | null {
  if (!name) return null;
  const preset = STATUS_COLOR_PRESETS.find((p) => p.id === name.toLowerCase());
  return preset?.hex ?? null;
}

/** Accept a stored status color: named token or #hex. */
export function resolveStatusHex(color: string | undefined, fallback = "#2f9d90"): string {
  const raw = (color ?? "").trim();
  if (!raw) return fallback;
  const named = namedStatusHex(raw);
  if (named) return named;
  return sanitizeHex(raw, fallback);
}

export function statusChipStyle(color?: string): { background: string; color: string } {
  const hex = resolveStatusHex(color);
  return {
    background: mixHex(hex, 0.22),
    color: mixHex(hex, 0.72, "#000000"),
  };
}

export function statusFillStyle(color?: string): { background: string; color: string } {
  const hex = resolveStatusHex(color);
  return { background: hex, color: contrastText(hex) };
}

export function sanitizeStatusColor(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (namedStatusHex(raw)) return raw.toLowerCase();
  return sanitizeHex(raw, "#2f9d90");
}
