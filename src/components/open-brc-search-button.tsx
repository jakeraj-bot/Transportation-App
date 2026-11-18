"use client";

import { useState } from "react";
import { brcSearchUrl } from "@/lib/utils";

/** Opens the Treasury search in a new tab and copies the two values from this form. */
export function OpenBrcSearchButton() {
  const [copied, setCopied] = useState("");
  return (
    <div>
      <button
        type="button"
        className="rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink"
        onClick={async (event) => {
          const form = event.currentTarget.closest("form");
          const nameControl = valueOf(form, "brcNameControl");
          const certificateNumber = valueOf(form, "brcNumber");
          const text = `Taxpayer name (first 4 letters): ${nameControl}\nCertificate number: ${certificateNumber}`;
          try {
            await navigator.clipboard.writeText(text);
            setCopied("Copied. Paste into the Treasury form, then Submit.");
          } catch {
            setCopied("Copy the name control and certificate number into the Treasury form.");
          }
          window.open(brcSearchUrl(), "_blank", "noreferrer");
        }}
      >
        Open BRC search
      </button>
      {copied ? <p className="mt-1 text-xs text-teal">{copied}</p> : null}
    </div>
  );
}

function valueOf(form: HTMLFormElement | null, name: string) {
  const field = form?.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.value.trim() : "";
}
