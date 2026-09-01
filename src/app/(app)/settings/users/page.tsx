import { softDelete } from "@/app/actions";
import { UserForm } from "@/components/user-form";
import { Card, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

export default async function UsersPage() {
  const [users, districts] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      include: { permissions: true, assignedDistricts: true },
      orderBy: { name: "asc" },
    }),
    prisma.district.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        backHref="/settings"
        hint="Say what each person does: reviewer, intake, office manager, route reviewer, or Super Admin. Assign districts so Home starts with their contracts."
      />
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
            }}
            districts={districts}
          />
          <form
            className="mt-3"
            action={async () => {
              "use server";
              await softDelete("user", user.id, "/settings/users");
            }}
          >
            <button className="text-sm text-rose" type="submit">Remove this user</button>
          </form>
        </Card>
      ))}
      <Card>
        <h2 className="serif mb-4 text-2xl">Add a person</h2>
        <UserForm districts={districts} />
      </Card>
    </div>
  );
}
