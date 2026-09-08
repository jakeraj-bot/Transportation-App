"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Card } from "./ui";

function Chevron() {
  return (
    <span className="collapse-chevron mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-cream text-muted" aria-hidden>
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M5 7.5 10 12.5 15 7.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function storageKey(path: string, title: string) {
  return `collapse:${path}:${title}`;
}

function useRememberOpen(title: string) {
  const path = usePathname() || "";
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const key = storageKey(path, title);
    if (sessionStorage.getItem(key) === "1") el.open = true;
    const onToggle = () => sessionStorage.setItem(key, el.open ? "1" : "0");
    el.addEventListener("toggle", onToggle);
    return () => el.removeEventListener("toggle", onToggle);
  }, [path, title]);
  return ref;
}

export function CollapsibleSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const ref = useRememberOpen(title);
  return (
    <Card className="overflow-hidden p-0">
      <details ref={ref}>
        <summary className="collapse-summary flex cursor-pointer items-start justify-between gap-4 px-6 py-5">
          <div>
            <h2 className="serif text-2xl">{title}</h2>
            {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
          </div>
          <Chevron />
        </summary>
        <div className="border-t border-line px-6 py-5">{children}</div>
      </details>
    </Card>
  );
}

export function CollapsibleBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const ref = useRememberOpen(title);
  return (
    <details ref={ref} className="overflow-hidden rounded-xl border border-line">
      <summary className="collapse-summary flex cursor-pointer items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="font-medium">{title}</p>
          {hint ? <p className="text-sm text-muted">{hint}</p> : null}
        </div>
        <Chevron />
      </summary>
      <div className="space-y-3 border-t border-line p-4">{children}</div>
    </details>
  );
}
