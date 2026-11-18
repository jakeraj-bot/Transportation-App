"use client";

import { useFormStatus } from "react-dom";
import { saveReviewChecks } from "@/app/actions";

function Check({
  name,
  label,
  defaultChecked,
  detail,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  detail?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={pending}
        className="size-4"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      />
      <span>
        {label}
        {detail ? <span className="ml-2 font-normal text-muted">{detail}</span> : null}
      </span>
    </label>
  );
}

export function ReviewChecks({
  contractId,
  firstDone,
  secondDone,
  firstDetail,
  secondDetail,
  canEdit,
}: {
  contractId: string;
  firstDone: boolean;
  secondDone: boolean;
  firstDetail?: string;
  secondDetail?: string;
  canEdit: boolean;
}) {
  if (!canEdit) {
    return (
      <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-line bg-card px-4 py-2 text-sm">
        <span>{firstDone ? "1st review done" : "1st review not done"}</span>
        <span>{secondDone ? "2nd review done" : "2nd review not done"}</span>
      </div>
    );
  }

  return (
    <form action={saveReviewChecks} className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-line bg-card px-4 py-2">
      <input type="hidden" name="id" value={contractId} />
      <Check name="firstDone" label="1st review done" defaultChecked={firstDone} detail={firstDetail} />
      <Check name="secondDone" label="2nd review done" defaultChecked={secondDone} detail={secondDetail} />
    </form>
  );
}
