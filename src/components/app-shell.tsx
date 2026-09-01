import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { SearchBox } from "./search-box";
import { AiPanel } from "./ai-panel";
import { MobileNav } from "./nav-controls";

export function AppShell({
  user,
  schoolYear,
  demo,
  children,
}: {
  user: SessionUser;
  schoolYear: string;
  demo?: boolean;
  children: React.ReactNode;
}) {
  const nav = [
    { href: "/", label: "Home" },
    { href: "/contracts", label: "Contracts" },
    { href: "/route-descriptions", label: "Route descriptions" },
    { href: "/bid-specs", label: "Bid specs" },
    { href: "/certs", label: "Annual certs" },
    { href: "/insurance", label: "Insurance" },
    { href: "/contractors", label: "Contractors" },
    { href: "/districts", label: "Districts" },
    { href: "/help", label: "Help" },
    ...(isSuperAdmin(user.role) ? [{ href: "/activity", label: "Activity" }] : []),
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-hidden bg-navy text-white/90 lg:flex">
        <div className="shrink-0 px-5 pb-4 pt-6">
          <p className="text-xs uppercase tracking-[0.16em] text-white/50">Passaic County</p>
          <p className="serif mt-1 text-2xl leading-tight text-white">Transportation</p>
          <p className="mt-1 text-sm text-white/55">School year {schoolYear}</p>
        </div>
        <nav className="nav-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl px-3 py-2 text-[15px] text-white/80 hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/logout" method="post" className="shrink-0 p-4">
          <p className="mb-2 truncate px-1 text-sm text-white/60">{user.name}</p>
          <button className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15" type="submit">
            Sign out
          </button>
        </form>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-cream/90 px-4 py-3 backdrop-blur md:px-8">
          <MobileNav items={nav} userName={user.name} />
          <Link href="/" className="serif text-lg text-ink lg:hidden">
            Transportation
          </Link>
          <SearchBox />
          <Link href="/help" className="hidden shrink-0 rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-teal hover:bg-teal-soft sm:inline-flex">
            Help
          </Link>
        </header>
        {demo ? (
          <div className="border-b border-amber/30 bg-amber-soft px-4 py-2 text-sm md:px-8">
            This is the <strong>demo</strong> on your computer. Sample contracts and staff are here so you can click around. The live office site will start empty.
          </div>
        ) : null}
        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <AiPanel />
    </div>
  );
}
