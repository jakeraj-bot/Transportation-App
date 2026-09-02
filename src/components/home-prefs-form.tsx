"use client";

import { useEffect, useMemo, useState } from "react";
import { saveHomePrefs } from "@/app/actions";
import { ColorField } from "@/components/color-field";
import { Button, Field, inputClass } from "@/components/ui";
import {
  HOME_ACCENTS,
  HOME_FONTS,
  HOME_FONT_SIZES,
  HOME_TILE_KEYS,
  colorsFromAccent,
  parseHomePrefs,
  userThemeCss,
  type HomeAccent,
  type HomeFont,
  type HomeFontSize,
  type HomePrefs,
  type HomeTileKey,
} from "@/lib/home-prefs";

const TILE_LABELS: Record<HomeTileKey, string> = {
  secondReview: "Waiting on 2nd review",
  rationale: "Need a rationale letter",
  quotes: "Quote timing flags",
  insurance: "Insurance to update",
  certs: "Certs not approved yet",
  missing: "1st review missing items",
};

type ColorKey =
  | "background"
  | "text"
  | "muted"
  | "nav"
  | "navText"
  | "btnPrimary"
  | "btnSecondary"
  | "btnDanger"
  | "btnHelp"
  | "btnSignOut"
  | "btnNewContract"
  | "btnNewCert"
  | "btnViewAll"
  | "scroll";

const COLOR_FIELDS: { key: ColorKey; label: string; hint?: string }[] = [
  { key: "background", label: "Page background" },
  { key: "text", label: "Letters (main text)" },
  { key: "muted", label: "Letters (secondary text)" },
  { key: "nav", label: "Navigation background" },
  { key: "navText", label: "Navigation letters" },
  { key: "scroll", label: "Scrollbar", hint: "The bar you drag in the navigation menu and on the page." },
];

const BUTTON_FIELDS: { key: ColorKey; label: string }[] = [
  { key: "btnPrimary", label: "Primary buttons (Save, most actions)" },
  { key: "btnSecondary", label: "Secondary buttons" },
  { key: "btnDanger", label: "Delete / danger buttons" },
  { key: "btnHelp", label: "Help button" },
  { key: "btnSignOut", label: "Sign out" },
  { key: "btnNewContract", label: "New contract (Home)" },
  { key: "btnNewCert", label: "New annual cert (Home)" },
  { key: "btnViewAll", label: "View all / my districts (Home)" },
];

export function HomePrefsForm({ prefs }: { prefs: HomePrefs }) {
  const [draft, setDraft] = useState<HomePrefs>(prefs);
  const [hidden, setHidden] = useState<HomeTileKey[]>(prefs.hiddenTiles);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const previewPrefs = useMemo(() => parseHomePrefs(JSON.stringify({ ...draft, hiddenTiles: hidden })), [draft, hidden]);
  const previewCss = useMemo(() => userThemeCss(previewPrefs), [previewPrefs]);

  useEffect(() => {
    const existing = document.getElementById("user-theme");
    const previous = existing?.textContent ?? "";
    if (existing) {
      existing.textContent = previewCss;
      return () => {
        existing.textContent = previous;
      };
    }
    const el = document.createElement("style");
    el.id = "user-theme-preview";
    el.textContent = previewCss;
    document.body.appendChild(el);
    return () => {
      el.remove();
    };
  }, [previewCss]);

  function toggleTile(key: HomeTileKey, checked: boolean) {
    setHidden((current) => (checked ? current.filter((item) => item !== key) : [...current, key]));
  }

  function applyPreset(accent: HomeAccent) {
    setDraft((current) => ({
      ...current,
      accent,
      ...colorsFromAccent(accent),
    }));
  }

  function setColor(key: ColorKey, hex: string) {
    setDraft((current) => ({ ...current, [key]: hex }));
  }

  return (
    <form
      className="grid gap-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setSaved("");
        try {
          await saveHomePrefs(new FormData(e.currentTarget));
          setSaved("Saved. You are still on this page.");
        } catch (err) {
          setSaved(err instanceof Error ? err.message : "Could not save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {hidden.map((key) => (
        <input key={key} type="hidden" name="hiddenTiles" value={key} />
      ))}

      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="text-sm font-medium text-ink">Live preview</p>
        <p className="mb-3 text-sm text-muted">This updates as you pick colors and fonts. Click Save to keep it.</p>
        <div className="overflow-hidden rounded-xl border border-line" style={{ fontFamily: "var(--app-font)", fontSize: "var(--app-font-size)" }}>
          <div className="flex items-center justify-between px-3 py-2" style={{ background: draft.nav, color: draft.navText }}>
            <span className="serif text-sm" style={{ fontFamily: "var(--app-heading-font)" }}>Transportation</span>
            <span className="rounded-lg px-2 py-1 text-xs" style={{ background: draft.btnSignOut, color: "var(--btn-signout-text)" }}>
              Sign out
            </span>
          </div>
          <div className="space-y-2 p-3" style={{ background: draft.background, color: draft.text }}>
            <p className="serif text-lg" style={{ fontFamily: "var(--app-heading-font)" }}>
              What needs attention today
            </p>
            <p style={{ color: draft.muted }}>Sample letters in your chosen size and font.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-lg px-3 py-1.5 text-sm" style={{ background: draft.btnNewContract, color: "var(--btn-new-contract-text)" }}>
                New contract
              </span>
              <span className="rounded-lg px-3 py-1.5 text-sm" style={{ background: draft.btnNewCert, color: "var(--btn-new-cert-text)" }}>
                New annual cert
              </span>
              <span className="rounded-lg px-3 py-1.5 text-sm" style={{ background: draft.btnViewAll, color: "var(--btn-view-all-text)" }}>
                View all
              </span>
              <span className="rounded-lg px-3 py-1.5 text-sm" style={{ background: draft.btnPrimary, color: "var(--btn-primary-text)" }}>
                Save
              </span>
            </div>
            <p className="text-xs text-muted">{draft.layout === "compact" ? "Compact Home: shorter counts and tighter tiles." : "Regular Home: full-size counts and tile hints."}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Home layout" hint="Compact shortens the Home title, counts, and tiles. Regular is the full layout.">
          <select
            className={inputClass}
            name="layout"
            value={draft.layout}
            onChange={(e) => setDraft((current) => ({ ...current, layout: e.target.value === "compact" ? "compact" : "regular" }))}
          >
            <option value="regular">Regular</option>
            <option value="compact">Compact</option>
          </select>
        </Field>
        <Field label="Color preset" hint="Picking a preset fills the hex values below. You can still type your own.">
          <select
            className={inputClass}
            name="accent"
            value={draft.accent}
            onChange={(e) => applyPreset(e.target.value as HomeAccent)}
          >
            {Object.entries(HOME_ACCENTS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Body font">
          <select
            className={inputClass}
            name="font"
            value={draft.font}
            onChange={(e) => setDraft((current) => ({ ...current, font: e.target.value as HomeFont }))}
          >
            {HOME_FONTS.map((font) => (
              <option key={font.id} value={font.id}>
                {font.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Heading font" hint="Titles such as page names and Home headings.">
          <select
            className={inputClass}
            name="headingFont"
            value={draft.headingFont}
            onChange={(e) => setDraft((current) => ({ ...current, headingFont: e.target.value as HomeFont }))}
          >
            {HOME_FONTS.map((font) => (
              <option key={font.id} value={font.id}>
                {font.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Letter size" className="md:col-span-2">
          <select
            className={inputClass}
            name="fontSize"
            value={draft.fontSize}
            onChange={(e) => setDraft((current) => ({ ...current, fontSize: e.target.value as HomeFontSize }))}
          >
            {HOME_FONT_SIZES.map((size) => (
              <option key={size.id} value={size.id}>
                {size.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div>
        <h3 className="serif mb-3 text-xl">Background, letters, and navigation</h3>
        <p className="mb-3 text-sm text-muted">Use the color square or type a hex code such as #2f9d90.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {COLOR_FIELDS.map((field) => (
            <ColorField
              key={field.key}
              label={field.label}
              name={field.key}
              value={draft[field.key]}
              hint={field.hint}
              onChange={(hex) => setColor(field.key, hex)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="serif mb-3 text-xl">Button colors</h3>
        <p className="mb-3 text-sm text-muted">Each button can be its own color. Home action buttons are listed separately so they do not have to match Save.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {BUTTON_FIELDS.map((field) => (
            <ColorField
              key={field.key}
              label={field.label}
              name={field.key}
              value={draft[field.key]}
              onChange={(hex) => setColor(field.key, hex)}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="showStatusBar"
            defaultChecked={prefs.showStatusBar}
          />
          <span>Show the status count bar</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="showAttentionTiles"
            defaultChecked={prefs.showAttentionTiles}
          />
          <span>Show the “needs attention” tiles</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="showSecondReview"
            defaultChecked={prefs.showSecondReview}
          />
          <span>Show contracts in 2nd review</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="showRecent"
            defaultChecked={prefs.showRecent}
          />
          <span>Show recently updated contracts</span>
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Tiles to show</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {HOME_TILE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!hidden.includes(key)}
                onChange={(e) => toggleTile(key, e.target.checked)}
              />
              <span>{TILE_LABELS[key]}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <Button type="submit">{busy ? "Saving…" : "Save my home screen"}</Button>
        {saved ? <p className="mt-2 text-sm text-muted">{saved}</p> : null}
      </div>
    </form>
  );
}
