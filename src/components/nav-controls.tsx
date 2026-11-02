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
          <button className="absolute inset-0 bg-black/40" type="button" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="app-nav absolute inset-y-0 left-0 flex w-72 flex-col overflow-hidden shadow-2xl">
            <div className="flex shrink-0 items-center justify-between px-5 py-4">
              <p className="serif text-xl">Transportation</p>
              <button type="button" onClick={() => setOpen(false)} className="app-nav-muted">
                Close
              </button>
            </div>
            <nav className="nav-scroll min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="app-nav-link block rounded-xl px-3 py-2.5 hover:bg-white/10"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <form action="/api/auth/logout" method="post" className="shrink-0 p-4">
              <p className="app-nav-muted mb-2 text-sm">{userName}</p>
              <button className="btn-signout w-full rounded-xl px-3 py-2 text-sm" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
