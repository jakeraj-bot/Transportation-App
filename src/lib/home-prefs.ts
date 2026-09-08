export const HOME_TILE_KEYS = [
  "secondReview",
  "rationale",
  "quotes",
  "insurance",
  "certs",
  "missing",
] as const;

export type HomeTileKey = (typeof HOME_TILE_KEYS)[number];

export const HOME_ACCENTS = {
  teal: {
    label: "Teal (office default)",
    teal: "#2f9d90",
    tealDark: "#247f75",
    tealSoft: "#d5f3ee",
    navy: "#2c6b78",
    cream: "#f3faf8",
    ink: "#1f3d42",
    muted: "#4f6b70",
  },
  navy: {
    label: "Navy",
    teal: "#2c6b78",
    tealDark: "#1e4a56",
    tealSoft: "#d7e8ec",
    navy: "#1e4a56",
    cream: "#eef4f6",
    ink: "#122033",
    muted: "#4a6270",
  },
  sage: {
    label: "Sage",
    teal: "#4cae6e",
    tealDark: "#2f5d44",
    tealSoft: "#dcf6e5",
    navy: "#2f5d44",
    cream: "#f3faf4",
    ink: "#1b2e24",
    muted: "#4d6456",
  },
  plum: {
    label: "Plum",
    teal: "#7a5ea7",
    tealDark: "#4a3a6b",
    tealSoft: "#eee6f7",
    navy: "#4a3a6b",
    cream: "#f7f3fb",
    ink: "#2a2430",
    muted: "#5c5368",
  },
  amber: {
    label: "Amber",
    teal: "#c4841a",
    tealDark: "#7a5410",
    tealSoft: "#fff1d0",
    navy: "#7a5410",
    cream: "#fff8eb",
    ink: "#3b2a12",
    muted: "#7a6240",
  },
  rose: {
    label: "Rose",
    teal: "#c45d6e",
    tealDark: "#7a3340",
    tealSoft: "#fde6e8",
    navy: "#7a3340",
    cream: "#fdf4f5",
    ink: "#3a1c22",
    muted: "#7a5360",
  },
  forest: {
    label: "Forest",
    teal: "#2d6a4f",
    tealDark: "#1b4332",
    tealSoft: "#d8eee4",
    navy: "#1b4332",
    cream: "#f4f1e8",
    ink: "#1b2e24",
    muted: "#4d6456",
  },
  ocean: {
    label: "Ocean",
    teal: "#0369a1",
    tealDark: "#0c4a6e",
    tealSoft: "#d6ecf8",
    navy: "#0c4a6e",
    cream: "#f0f9ff",
    ink: "#0c1929",
    muted: "#3d5a70",
  },
  wine: {
    label: "Wine",
    teal: "#7b2d3b",
    tealDark: "#4a1c28",
    tealSoft: "#f3dce0",
    navy: "#4a1c28",
    cream: "#f8f1ee",
    ink: "#2a1518",
    muted: "#6e4a50",
  },
  slate: {
    label: "Slate",
    teal: "#475569",
    tealDark: "#1e293b",
    tealSoft: "#e2e8f0",
    navy: "#1e293b",
    cream: "#f1f5f9",
    ink: "#0f172a",
    muted: "#475569",
  },
  copper: {
    label: "Copper",
    teal: "#b45309",
    tealDark: "#7c2d12",
    tealSoft: "#fde8d0",
    navy: "#7c2d12",
    cream: "#faf6f0",
    ink: "#1c1917",
    muted: "#6b5344",
  },
  olive: {
    label: "Olive",
    teal: "#4d7c0f",
    tealDark: "#365314",
    tealSoft: "#e4efc8",
    navy: "#365314",
    cream: "#f7f8f0",
    ink: "#1a2e05",
    muted: "#4f6140",
  },
  charcoal: {
    label: "Charcoal",
    teal: "#374151",
    tealDark: "#111827",
    tealSoft: "#e5e7eb",
    navy: "#111827",
    cream: "#f3f4f6",
    ink: "#111827",
    muted: "#4b5563",
  },
  sky: {
    label: "Sky",
    teal: "#0284c7",
    tealDark: "#0369a1",
    tealSoft: "#e0f2fe",
    navy: "#075985",
    cream: "#f0f9ff",
    ink: "#0c4a6e",
    muted: "#3d6a88",
  },
} as const;

export type HomeAccent = keyof typeof HOME_ACCENTS;

export type HomeFont = "sans" | "serif" | "georgia" | "palatino" | "mono";
export type HomeFontSize = "sm" | "md" | "lg" | "xl";

export const HOME_FONTS: { id: HomeFont; label: string; stack: string }[] = [
  { id: "sans", label: "Source Sans (default)", stack: 'var(--font-sans), "Segoe UI", system-ui, sans-serif' },
  { id: "serif", label: "Source Serif", stack: 'var(--font-serif), Georgia, "Times New Roman", serif' },
  { id: "georgia", label: "Georgia", stack: 'Georgia, "Times New Roman", serif' },
  { id: "palatino", label: "Palatino", stack: 'Palatino, "Palatino Linotype", "Book Antiqua", serif' },
  { id: "mono", label: "Monospace", stack: 'ui-monospace, "Source Code Pro", Menlo, monospace' },
];

export const HOME_FONT_SIZES: { id: HomeFontSize; label: string; px: string; h1: string }[] = [
  { id: "sm", label: "Small", px: "14px", h1: "1.6rem" },
  { id: "md", label: "Medium (default)", px: "16.5px", h1: "1.875rem" },
  { id: "lg", label: "Large", px: "18px", h1: "2.1rem" },
  { id: "xl", label: "Extra large", px: "20px", h1: "2.35rem" },
];

const HEX = /^#?[0-9a-fA-F]{6}$/;

export function sanitizeHex(value: string | undefined, fallback: string): string {
  const v = (value ?? "").trim();
  if (!HEX.test(v)) return fallback;
  return v.startsWith("#") ? v.toLowerCase() : `#${v.toLowerCase()}`;
}

function hexParts(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixHex(hex: string, amount: number, withHex = "#ffffff"): string {
  const [r, g, b] = hexParts(sanitizeHex(hex, "#000000"));
  const [wr, wg, wb] = hexParts(sanitizeHex(withHex, "#ffffff"));
  const mix = (a: number, w: number) => Math.round(a * amount + w * (1 - amount));
  return `#${[mix(r, wr), mix(g, wg), mix(b, wb)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function contrastText(hex: string): string {
  const [r, g, b] = hexParts(sanitizeHex(hex, "#000000"));
  const y = (r * 299 + g * 587 + b * 114) / 1000;
  return y > 160 ? "#1a1a1a" : "#ffffff";
}

export type HomePrefs = {
  layout: "regular" | "compact";
  accent: HomeAccent;
  showStatusBar: boolean;
  showAttentionTiles: boolean;
  showSecondReview: boolean;
  showRecent: boolean;
  hiddenTiles: HomeTileKey[];
  font: HomeFont;
  headingFont: HomeFont;
  fontSize: HomeFontSize;
  background: string;
  text: string;
  muted: string;
  nav: string;
  navText: string;
  btnPrimary: string;
  btnSecondary: string;
  btnDanger: string;
  btnHelp: string;
  btnSignOut: string;
  btnNewContract: string;
  btnNewCert: string;
  btnViewAll: string;
};

export function colorsFromAccent(accent: HomeAccent) {
  const t = HOME_ACCENTS[accent] ?? HOME_ACCENTS.teal;
  return {
    background: t.cream,
    text: t.ink,
    muted: t.muted,
    nav: t.navy,
    navText: "#ffffff",
    btnPrimary: t.teal,
    btnSecondary: "#ffffff",
    btnDanger: "#991b1b",
    btnHelp: t.teal,
    btnSignOut: "#ffffff",
    btnNewContract: t.teal,
    btnNewCert: t.navy,
    btnViewAll: t.navy,
  };
}

export const DEFAULT_HOME_PREFS: HomePrefs = {
  layout: "regular",
  accent: "teal",
  showStatusBar: true,
  showAttentionTiles: true,
  showSecondReview: true,
  showRecent: true,
  hiddenTiles: [],
  font: "sans",
  headingFont: "serif",
  fontSize: "md",
  ...colorsFromAccent("teal"),
};

function isAccent(value: unknown): value is HomeAccent {
  return typeof value === "string" && value in HOME_ACCENTS;
}

function isFont(value: unknown): value is HomeFont {
  return HOME_FONTS.some((f) => f.id === value);
}

function isFontSize(value: unknown): value is HomeFontSize {
  return HOME_FONT_SIZES.some((s) => s.id === value);
}

export function parseHomePrefs(raw?: string | null): HomePrefs {
  if (!raw) return { ...DEFAULT_HOME_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<HomePrefs>;
    const accent = isAccent(parsed.accent) ? parsed.accent : DEFAULT_HOME_PREFS.accent;
    const fromAccent = colorsFromAccent(accent);
    const hiddenTiles = Array.isArray(parsed.hiddenTiles)
      ? parsed.hiddenTiles.filter((key): key is HomeTileKey => HOME_TILE_KEYS.includes(key as HomeTileKey))
      : [];
    return {
      layout: parsed.layout === "compact" ? "compact" : "regular",
      accent,
      showStatusBar: parsed.showStatusBar !== false,
      showAttentionTiles: parsed.showAttentionTiles !== false,
      showSecondReview: parsed.showSecondReview !== false,
      showRecent: parsed.showRecent !== false,
      hiddenTiles,
      font: isFont(parsed.font) ? parsed.font : DEFAULT_HOME_PREFS.font,
      headingFont: isFont(parsed.headingFont) ? parsed.headingFont : DEFAULT_HOME_PREFS.headingFont,
      fontSize: isFontSize(parsed.fontSize) ? parsed.fontSize : DEFAULT_HOME_PREFS.fontSize,
      background: sanitizeHex(parsed.background, fromAccent.background),
      text: sanitizeHex(parsed.text, fromAccent.text),
      muted: sanitizeHex(parsed.muted, fromAccent.muted),
      nav: sanitizeHex(parsed.nav, fromAccent.nav),
      navText: sanitizeHex(parsed.navText, fromAccent.navText),
      btnPrimary: sanitizeHex(parsed.btnPrimary, fromAccent.btnPrimary),
      btnSecondary: sanitizeHex(parsed.btnSecondary, fromAccent.btnSecondary),
      btnDanger: sanitizeHex(parsed.btnDanger, fromAccent.btnDanger),
      btnHelp: sanitizeHex(parsed.btnHelp, fromAccent.btnHelp),
      btnSignOut: sanitizeHex(parsed.btnSignOut, fromAccent.btnSignOut),
      btnNewContract: sanitizeHex(parsed.btnNewContract, fromAccent.btnNewContract),
      btnNewCert: sanitizeHex(parsed.btnNewCert, fromAccent.btnNewCert),
      btnViewAll: sanitizeHex(parsed.btnViewAll, fromAccent.btnViewAll),
    };
  } catch {
    return { ...DEFAULT_HOME_PREFS };
  }
}

export function fontStack(id: HomeFont): string {
  return HOME_FONTS.find((f) => f.id === id)?.stack ?? HOME_FONTS[0].stack;
}

export function fontSizeMeta(id: HomeFontSize) {
  return HOME_FONT_SIZES.find((s) => s.id === id) ?? HOME_FONT_SIZES[1];
}

/** CSS injected on every signed-in page so nav, background, buttons, and type actually change. */
export function userThemeCss(prefs: HomePrefs): string {
  const teal = prefs.btnPrimary;
  const tealDark = mixHex(teal, 0.78, "#000000");
  const tealSoft = mixHex(teal, 0.18);
  const navy = prefs.nav;
  const cream = prefs.background;
  const ink = prefs.text;
  const muted = prefs.muted;
  const line = mixHex(muted, 0.22, cream);
  const size = fontSizeMeta(prefs.fontSize);
  const btn = (hex: string) => ({ bg: hex, text: contrastText(hex), dark: mixHex(hex, 0.82, "#000000") });
  const primary = btn(prefs.btnPrimary);
  const secondary = btn(prefs.btnSecondary);
  const danger = btn(prefs.btnDanger);
  const help = btn(prefs.btnHelp);
  const signOut = btn(prefs.btnSignOut);
  const newContract = btn(prefs.btnNewContract);
  const newCert = btn(prefs.btnNewCert);
  const viewAll = btn(prefs.btnViewAll);
  return `
:root, html {
  --cream: ${cream};
  --card: #ffffff;
  --ink: ${ink};
  --muted: ${muted};
  --line: ${line};
  --teal: ${teal};
  --teal-dark: ${tealDark};
  --teal-soft: ${tealSoft};
  --navy: ${navy};
  --nav-text: ${prefs.navText};
  --color-cream: ${cream};
  --color-card: #ffffff;
  --color-ink: ${ink};
  --color-muted: ${muted};
  --color-line: ${line};
  --color-teal: ${teal};
  --color-teal-dark: ${tealDark};
  --color-teal-soft: ${tealSoft};
  --color-navy: ${navy};
  --btn-primary: ${primary.bg};
  --btn-primary-text: ${primary.text};
  --btn-primary-dark: ${primary.dark};
  --btn-secondary: ${secondary.bg};
  --btn-secondary-text: ${secondary.text};
  --btn-danger: ${danger.bg};
  --btn-danger-text: ${danger.text};
  --btn-help: ${help.bg};
  --btn-help-text: ${help.text};
  --btn-signout: ${signOut.bg};
  --btn-signout-text: ${signOut.text};
  --btn-new-contract: ${newContract.bg};
  --btn-new-contract-text: ${newContract.text};
  --btn-new-cert: ${newCert.bg};
  --btn-new-cert-text: ${newCert.text};
  --btn-view-all: ${viewAll.bg};
  --btn-view-all-text: ${viewAll.text};
  --app-font: ${fontStack(prefs.font)};
  --app-heading-font: ${fontStack(prefs.headingFont)};
  --app-font-size: ${size.px};
  --app-h1-size: ${size.h1};
}
html, body {
  background: ${cream} !important;
  color: ${ink} !important;
}
body {
  font-family: ${fontStack(prefs.font)} !important;
  font-size: ${size.px} !important;
}
h1, h2, h3, .serif {
  font-family: ${fontStack(prefs.headingFont)} !important;
}
h1 {
  font-size: ${size.h1} !important;
}
`.trim();
}
