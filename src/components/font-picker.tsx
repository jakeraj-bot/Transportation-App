"use client";

import { FONT_GROUPS, HOME_FONTS, type HomeFont } from "@/lib/home-prefs";
import { cn } from "@/lib/utils";

export function FontPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: HomeFont;
  onChange: (id: HomeFont) => void;
}) {
  return (
    <div className="grid gap-4">
      {FONT_GROUPS.map((group) => {
        const fonts = HOME_FONTS.filter((font) => font.group === group.id);
        if (!fonts.length) return null;
        return (
          <div key={group.id}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{group.label}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {fonts.map((font) => {
                const selected = font.id === value;
                return (
                  <label
                    key={font.id}
                    className={cn(
                      "cursor-pointer rounded-xl border px-3 py-2.5 transition",
                      selected ? "border-teal bg-teal-soft" : "border-line bg-white hover:border-teal",
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={name}
                      value={font.id}
                      checked={selected}
                      onChange={() => onChange(font.id)}
                    />
                    <span className="block text-lg leading-tight" style={{ fontFamily: font.stack }}>
                      {font.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted" style={{ fontFamily: font.stack }}>
                      Review packets and letters
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
