import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { UserThemeStyle } from "@/components/user-theme";
import { getSession } from "@/lib/auth";
import { getSchoolYear, getSetting } from "@/lib/data";
import { parseHomePrefs, userThemeCss } from "@/lib/home-prefs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const [schoolYear, demoMode, me] = await Promise.all([
    getSchoolYear(),
    getSetting("demoMode", "off"),
    prisma.user.findUnique({ where: { id: session.id }, select: { homePrefs: true } }),
  ]);
  const prefs = parseHomePrefs(me?.homePrefs);
  return (
    <>
      <UserThemeStyle css={userThemeCss(prefs)} />
      <AppShell user={session} schoolYear={schoolYear} demo={demoMode === "on"} homeLayout={prefs.layout}>
        {children}
      </AppShell>
    </>
  );
}
