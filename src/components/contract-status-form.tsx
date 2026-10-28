"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updateContractStatus } from "@/app/actions";
import { SecondReviewerPicker } from "@/components/reviewer-fields";
import { Button, Field, inputClass } from "@/components/ui";

function UpdateStatusButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Updating…" : "Update status"}
    </Button>
  );
}

export function ContractStatusForm({
  contractId,
  statusName,
  statuses,
  secondReviewers,
  secondReviewerId,
}: {
  contractId: string;
  statusName: string;
  statuses: Array<{ id: string; name: string }>;
  secondReviewers: Array<{ id: string; name: string }>;
  secondReviewerId?: string | null;
}) {
  const [status, setStatus] = useState(statusName);
  const names = statuses.some((row) => row.name === statusName)
    ? statuses
    : [{ id: "current", name: statusName }, ...statuses];

  return (
    <form action={updateContractStatus} className="mt-4 flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={contractId} />
      <Field label="Change status" className="min-w-56 flex-1">
        <select
          className={inputClass}
          name="statusName"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {names.map((row) => (
            <option key={row.id} value={row.name}>
              {row.name}
            </option>
          ))}
        </select>
      </Field>
      {status === "2nd review" ? (
        <div className="min-w-64 flex-1">
          <SecondReviewerPicker reviewers={secondReviewers} defaultId={secondReviewerId} />
        </div>
      ) : null}
      <UpdateStatusButton />
    </form>
  );
}
