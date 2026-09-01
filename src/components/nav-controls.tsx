"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function BackLink({ href }: { href?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <button
      type="button"
      className="mb-3 text-sm font-medium text-teal hover:underline"
      onClick={() => (href ? router.push(href) : router.back())}
    >
      ← Back
    </button>
  );
}

export function MobileNav({
  items,
  userName,
}: {
  items: Array<{ href: string; label: string }>;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        Menu
      </button>
      {open ? (
        <div className="fixed inset-0 z-40">
          <button className="absolute inset-0 bg-navy/40" type="button" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-navy text-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4">
              <p className="serif text-xl">Transportation</p>
              <button type="button" onClick={() => setOpen(false)} className="text-white/70">
                Close
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-white/85 hover:bg-white/10"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <form action="/api/auth/logout" method="post" className="p-4">
              <p className="mb-2 text-sm text-white/60">{userName}</p>
              <button className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
