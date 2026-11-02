"use client";

import { useState } from "react";
import { ColorField } from "@/components/color-field";
import { inputClass } from "@/components/ui";
import { STATUS_COLOR_PRESETS, resolveStatusHex } from "@/lib/status-color";

export function StatusColorField({ name = "color", defaultValue }: { name?: string; defaultValue?: string }) {
  const [hex, setHex] = useState(resolveStatusHex(defaultValue));
  return (
    <div className="space-y-2">
      <ColorField label="Color" name={name} value={hex} hint="Use the square or type a hex code." onChange={setHex} />
      <select
        className={inputClass}
        value={STATUS_COLOR_PRESETS.some((p) => p.hex === hex.toLowerCase()) ? hex.toLowerCase() : ""}
        onChange={(e) => {
          if (e.target.value) setHex(e.target.value);
        }}
      >
        <option value="">Custom hex</option>
        {STATUS_COLOR_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.hex}>
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  );
}
