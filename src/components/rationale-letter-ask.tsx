"use client";

import { useState } from "react";

export function RationaleLetterAsk({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={open}
          onChange={(event) => setOpen(event.target.checked)}
        />
        <span className="font-medium">Rationale letter</span>
      </label>
      {open ? <div className="mt-3 space-y-2">{children}</div> : null}
    </div>
  );
}
