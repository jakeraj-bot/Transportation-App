"use client";

import { useState } from "react";
import { saveHomePrefs } from "@/app/actions";
import { Button, Field, inputClass } from "@/components/ui";
import {
  HOME_ACCENTS,
  HOME_TILE_KEYS,
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

export function HomePrefsForm({ prefs }: { prefs: HomePrefs }) {
  const [hidden, setHidden] = useState<HomeTileKey[]>(prefs.hiddenTiles);

  function toggleTile(key: HomeTileKey, checked: boolean) {
    setHidden((current) => (checked ? current.filter((item) => item !== key) : [...current, key]));
  }

  return (
    <form action={saveHomePrefs} className="grid gap-4 md:grid-cols-2">
      {hidden.map((key) => (
        <input key={key} type="hidden" name="hiddenTiles" value={key} />
      ))}
      <Field label="Home layout" hint="Compact shortens the counts and tiles. Regular is the current layout.">
        <select className={inputClass} name="layout" defaultValue={prefs.layout}>
          <option value="regular">Regular</option>
          <option value="compact">Compact</option>
        </select>
      </Field>
      <Field label="Home color">
        <select className={inputClass} name="accent" defaultValue={prefs.accent}>
          {Object.entries(HOME_ACCENTS).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="showStatusBar" defaultChecked={prefs.showStatusBar} />
        <span>Show the status count bar</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="showAttentionTiles" defaultChecked={prefs.showAttentionTiles} />
        <span>Show the “needs attention” tiles</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="showSecondReview" defaultChecked={prefs.showSecondReview} />
        <span>Show contracts in 2nd review</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="showRecent" defaultChecked={prefs.showRecent} />
        <span>Show recently updated contracts</span>
      </label>
      <div className="md:col-span-2">
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
        <Button type="submit">Save my home screen</Button>
      </div>
    </form>
  );
}
