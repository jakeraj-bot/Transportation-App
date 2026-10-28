"use client";

/** Open a generated file after a server action. Popups are often blocked after await; fall back to same-tab download. */
export function openGeneratedFile(url: string): "popup" | "navigate" {
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (popup) {
    popup.opener = null;
    return "popup";
  }
  window.location.assign(url);
  return "navigate";
}
