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
    label: "Teal",
    teal: "#2f9d90",
    tealDark: "#247f75",
    tealSoft: "#d5f3ee",
    navy: "#2c6b78",
    cream: "#f3faf8",
  },
  navy: {
    label: "Navy",
    teal: "#2c6b78",
    tealDark: "#1e4a56",
    tealSoft: "#d7e8ec",
    navy: "#1e4a56",
    cream: "#eef4f6",
  },
  sage: {
    label: "Sage",
    teal: "#4cae6e",
    tealDark: "#2f5d44",
    tealSoft: "#dcf6e5",
    navy: "#2f5d44",
    cream: "#f3faf4",
  },
  plum: {
    label: "Plum",
    teal: "#7a5ea7",
    tealDark: "#4a3a6b",
    tealSoft: "#eee6f7",
    navy: "#4a3a6b",
    cream: "#f7f3fb",
  },
  amber: {
    label: "Amber",
    teal: "#c4841a",
    tealDark: "#7a5410",
    tealSoft: "#fff1d0",
    navy: "#7a5410",
    cream: "#fff8eb",
  },
  rose: {
    label: "Rose",
    teal: "#c45d6e",
    tealDark: "#7a3340",
    tealSoft: "#fde6e8",
    navy: "#7a3340",
    cream: "#fdf4f5",
  },
} as const;

export type HomeAccent = keyof typeof HOME_ACCENTS;

export type HomePrefs = {
  layout: "regular" | "compact";
  accent: HomeAccent;
  showStatusBar: boolean;
  showAttentionTiles: boolean;
  showSecondReview: boolean;
  showRecent: boolean;
  hiddenTiles: HomeTileKey[];
};

export const DEFAULT_HOME_PREFS: HomePrefs = {
  layout: "regular",
  accent: "teal",
  showStatusBar: true,
  showAttentionTiles: true,
  showSecondReview: true,
  showRecent: true,
  hiddenTiles: [],
};

export function parseHomePrefs(raw?: string | null): HomePrefs {
  if (!raw) return { ...DEFAULT_HOME_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<HomePrefs>;
    const accent = parsed.accent && parsed.accent in HOME_ACCENTS ? parsed.accent : DEFAULT_HOME_PREFS.accent;
    const hiddenTiles = Array.isArray(parsed.hiddenTiles)
      ? parsed.hiddenTiles.filter((key): key is HomeTileKey =>
          HOME_TILE_KEYS.includes(key as HomeTileKey)
        )
      : [];
    return {
      layout: parsed.layout === "compact" ? "compact" : "regular",
      accent,
      showStatusBar: parsed.showStatusBar !== false,
      showAttentionTiles: parsed.showAttentionTiles !== false,
      showSecondReview: parsed.showSecondReview !== false,
      showRecent: parsed.showRecent !== false,
      hiddenTiles,
    };
  } catch {
    return { ...DEFAULT_HOME_PREFS };
  }
}

export function homeThemeStyle(accent: HomeAccent): Record<string, string> {
  const theme = HOME_ACCENTS[accent];
  return {
    "--teal": theme.teal,
    "--color-teal": theme.teal,
    "--teal-dark": theme.tealDark,
    "--color-teal-dark": theme.tealDark,
    "--teal-soft": theme.tealSoft,
    "--color-teal-soft": theme.tealSoft,
    "--navy": theme.navy,
    "--color-navy": theme.navy,
    "--cream": theme.cream,
    "--color-cream": theme.cream,
  };
}
