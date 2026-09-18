"use client";

import { useState } from "react";
import { saveUser } from "@/app/actions";
import { Button, Field, inputClass } from "@/components/ui";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { ROLE_PERMISSIONS, ROLES } from "@/lib/roles";

export function UserForm({
  user,
  districts,
}: {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
    districtIds: string[];
    adminSetPassword?: string | null;
  };
  districts: Array<{ id: string; name: string }>;
}) {
  const [role, setRole] = useState(user?.role ?? "staff");
  const [perms, setPerms] = useState<string[]>(
    user?.permissions?.length ? user.permissions : ROLE_PERMISSIONS[user?.role ?? "staff"] ?? ["view"]
  );

  function changeRole(next: string) {
    setRole(next);
    setPerms(ROLE_PERMISSIONS[next] ?? ["view"]);
  }

  return (
    <form action={saveUser} className="grid gap-4 md:grid-cols-2">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <Field label="Name">
        <input className={inputClass} name="name" required defaultValue={user?.name} />
      </Field>
      <Field label="Email">
        <input className={inputClass} name="email" type="email" required defaultValue={user?.email} />
      </Field>
      {user?.adminSetPassword ? (
        <Field label="Password on file" hint="This is the password you last saved for them. Only Super Admin can see it.">
          <input className={inputClass} readOnly value={user.adminSetPassword} />
        </Field>
      ) : null}
      <Field
        label={user ? "New password (leave blank to keep)" : "Password"}
        hint={!user ? "If you leave this blank, the starter password is Passaic2026!" : user?.adminSetPassword ? "Type a new password here if you need to change it. It will replace the one on file." : "The current password is hidden because it was set before this screen could show it. Type a new one to keep a copy here."}
      >
        <input className={inputClass} name="password" type="text" autoComplete="new-password" />
      </Field>
      <Field label="What they do in the office">
        <select className={inputClass} name="role" value={role} onChange={(e) => changeRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
        <span className="mt-1 block text-sm text-muted">
          {ROLES.find((r) => r.key === role)?.hint}
        </span>
      </Field>
      <div className="md:col-span-2">
        <p className="mb-2 text-sm font-medium">Their districts</p>
        <p className="mb-2 text-sm text-muted">
          Leave blank to see every district. Assign districts so a reviewer’s Home screen starts with only their contracts. They can still open View all.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {districts.map((d) => (
            <label key={d.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="districtIds"
                value={d.id}
                defaultChecked={user?.districtIds.includes(d.id)}
              />
              <span>{d.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="md:col-span-2 grid gap-2 sm:grid-cols-2">
        {PERMISSIONS.map((p) => (
          <label key={p.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              name={`perm_${p.key}`}
              checked={perms.includes(p.key)}
              onChange={(e) => {
                const key = p.key as PermissionKey;
                setPerms((current) =>
                  e.target.checked ? [...current, key] : current.filter((x) => x !== key)
                );
              }}
            />
            <span>{p.label}</span>
          </label>
        ))}
      </div>
      <div>
        <Button type="submit">{user ? "Save user" : "Add user"}</Button>
      </div>
    </form>
  );
}
