"use client";

import { inputClass } from "@/components/ui";

export function ColorField({
  label,
  name,
  value,
  hint,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  hint?: string;
  onChange: (hex: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <input
          aria-label={`${label} color picker`}
          className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-white p-1"
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className={inputClass}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#2f9d90"
          spellCheck={false}
        />
      </div>
      {hint ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
    </label>
  );
}
