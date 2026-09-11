import { redirect } from "next/navigation";
import { sendUserLoginEmail, softDelete } from "@/app/actions";
import { CollapsibleSection } from "@/components/collapsible";
import { UserForm } from "@/components/user-form";
import { Button, Card, Flag, PageHeader } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { outlookConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { ROLES } from "@/lib/roles";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ loginEmail?: string; loginError?: string }>;
}) {
  const session = await getSession();
  if (!isSuperAdmin(session?.role)) redirect("/settings");
  const { loginEmail, loginError } = await searchParams;
  const [users, districts] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      include: { permissions: true, assignedDistricts: true },
      orderBy: { name: "asc" },
    }),
    prisma.district.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  const outlook = outlookConfigured();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        backHref="/settings"
        hint="Click a name to open that account. Click it again to close it. Say what each person does and assign districts so Home starts with their contracts."
      />
      <Card>
        <h2 className="serif mb-2 text-2xl">After you create an account</h2>
        <p className="text-muted">
          The app does not send an invite on its own. Share the email and password with that person, or open their name and use Email login details if Outlook is connected.
          {outlook ? " Outlook is connected, so that button will try to send the email." : " Outlook is not connected yet, so you will need to send the email yourself."}
        </p>
      </Card>
      {loginEmail === "sent" ? <Flag tone="sage">The login email was sent.</Flag> : null}
      {loginEmail === "drafted" ? <Flag tone="amber">The login email was saved as a draft. {loginError}</Flag> : null}
      {loginEmail === "failed" ? <Flag tone="rose">The login email did not send. {loginError}</Flag> : null}
      {users.map((user) => {
        const roleLabel = ROLES.find((r) => r.key === user.role)?.label ?? user.role;
        return (
          <CollapsibleSection
            key={user.id}
            title={user.name}
            hint={`${roleLabel} · ${user.email}`}
            rememberAs={`user:${user.id}`}
          >
            <UserForm
              user={{
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.permissions.map((p) => p.permissionKey),
                districtIds: user.assignedDistricts.map((d) => d.districtId),
                adminSetPassword: user.adminSetPassword,
              }}
              districts={districts}
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <form action={sendUserLoginEmail}>
                <input type="hidden" name="id" value={user.id} />
                <Button type="submit" variant="secondary">Email login details</Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await softDelete("user", user.id, "/settings/users");
                }}
              >
                <button className="text-sm text-rose" type="submit">Remove this user</button>
              </form>
            </div>
          </CollapsibleSection>
        );
      })}
      <CollapsibleSection title="Add a person" hint="Create a new login for someone in the office." rememberAs="user:new">
        <UserForm districts={districts} />
      </CollapsibleSection>
    </div>
  );
}
