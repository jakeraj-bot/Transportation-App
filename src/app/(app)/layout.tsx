import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { getSchoolYear, getSetting } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const [schoolYear, demoMode] = await Promise.all([getSchoolYear(), getSetting("demoMode", "off")]);
  return (
    <AppShell user={session} schoolYear={schoolYear} demo={demoMode === "on"}>
      {children}
    </AppShell>
  );
}
