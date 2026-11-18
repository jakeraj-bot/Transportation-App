"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updateContractStatus } from "@/app/actions";
import { contractReviewBlock } from "@/lib/review-gates";

const controlClass = "min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink";

function UpdateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-lg bg-teal px-2 py-1 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "Saving…" : "Update"}
    </button>
  );
}

export function ContractStatusForm({
  contractId,
  statusName,
  statuses,
  secondReviewers,
  secondReviewerId,
  firstReviewDone,
  secondReviewDone,
}: {
  contractId: string;
  statusName: string;
  statuses: Array<{ id: string; name: string }>;
  secondReviewers: Array<{ id: string; name: string }>;
  secondReviewerId?: string | null;
  firstReviewDone: boolean;
  secondReviewDone: boolean;
}) {
  const [status, setStatus] = useState(statusName);
  const [error, setError] = useState("");
  const names = statuses.some((row) => row.name === statusName)
    ? statuses
    : [{ id: "current", name: statusName }, ...statuses];

  return (
    <form
      action={updateContractStatus}
      className="flex flex-wrap items-center gap-1.5"
      onSubmit={(event) => {
        const block = contractReviewBlock(status, { firstReviewDone, secondReviewDone }, statusName);
        setError(block ?? "");
        if (block) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={contractId} />
      <div className="flex items-center gap-1.5">
        <select
          className={controlClass}
          name="statusName"
          aria-label="Change status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {names.map((row) => (
            <option key={row.id} value={row.name}>
              {row.name}
            </option>
          ))}
        </select>
        <UpdateButton />
      </div>
      {status === "2nd review" ? (
        <select
          className={controlClass}
          name="secondReviewerId"
          aria-label="2nd reviewer"
          required
          defaultValue={secondReviewerId ?? ""}
        >
          <option value="">2nd reviewer</option>
          {secondReviewers.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      ) : null}
      {error ? <p className="text-xs text-rose">{error}</p> : null}
    </form>
  );
}
