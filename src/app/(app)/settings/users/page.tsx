import { redirect } from "next/navigation";
import { sendUserLoginEmail, softDelete } from "@/app/actions";
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
        hint="Say what each person does: reviewer, intake, office manager, route reviewer, or Super Admin. Assign districts so Home starts with their contracts."
      />
      <Card>
        <h2 className="serif mb-2 text-2xl">After you create an account</h2>
        <p className="text-muted">
          The app does not send an invite on its own. Share the email and password with that person, or use Email login details below if Outlook is connected.
          {outlook ? " Outlook is connected, so that button will try to send the email." : " Outlook is not connected yet, so you will need to send the email yourself."}
        </p>
      </Card>
      {loginEmail === "sent" ? <Flag tone="sage">The login email was sent.</Flag> : null}
      {loginEmail === "drafted" ? <Flag tone="amber">The login email was saved as a draft. {loginError}</Flag> : null}
      {loginEmail === "failed" ? <Flag tone="rose">The login email did not send. {loginError}</Flag> : null}
      {users.map((user) => (
        <Card key={user.id}>
          <p className="mb-4 text-sm text-muted">
            {ROLES.find((r) => r.key === user.role)?.label ?? user.role}
          </p>
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
        </Card>
      ))}
      <Card>
        <h2 className="serif mb-4 text-2xl">Add a person</h2>
        <UserForm districts={districts} />
      </Card>
    </div>
  );
}
