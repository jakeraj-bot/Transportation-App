"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSecondReviewNote } from "@/app/actions";
import { inputClass } from "@/components/ui";

export function SecondReviewNote({
  contractId,
  done,
  note,
  assignee,
  completedLabel,
  completedBy,
  canEdit,
}: {
  contractId: string;
  done: boolean;
  note: string;
  assignee?: string;
  completedLabel?: string;
  completedBy?: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(done);
  const [text, setText] = useState(note);
  const [message, setMessage] = useState("");

  async function save(nextDone: boolean, nextNote: string) {
    setMessage("Saving…");
    const form = new FormData();
    form.set("id", contractId);
    if (nextDone) form.set("done", "on");
    form.set("note", nextNote);
    await saveSecondReviewNote(form);
    setMessage(nextDone ? "2nd review is noted as done." : "2nd review is no longer marked done.");
    router.refresh();
  }

  return (
    <div>
      <h3 className="mb-2 font-medium">2nd review</h3>
      <p className="mb-3 text-sm text-muted">
        Check this when the second look is finished. Write what you confirmed.
        {assignee ? ` Assigned to ${assignee}.` : ""}
      </p>
      {canEdit ? (
        <div className="rounded-xl border border-line bg-white p-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-4"
              checked={checked}
              onChange={async (event) => {
                const next = event.target.checked;
                setChecked(next);
                await save(next, text);
              }}
            />
            <span className="font-medium">2nd review done</span>
          </label>
          {checked && completedLabel ? (
            <p className="mt-2 text-sm text-muted">
              Done {completedLabel}
              {completedBy ? ` by ${completedBy}` : ""}.
            </p>
          ) : null}
          <textarea
            className={`${inputClass} mt-2`}
            rows={2}
            placeholder="What the 2nd review confirmed"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => {
              if (text.trim() !== note.trim()) void save(checked, text);
            }}
          />
          {message ? <p className="mt-2 text-xs">{message}</p> : null}
        </div>
      ) : (
        <p className="text-sm">
          {done
            ? `2nd review done${completedLabel ? ` ${completedLabel}` : ""}${completedBy ? ` by ${completedBy}` : ""}.${note ? ` ${note}` : ""}`
            : "2nd review is not marked done yet."}
        </p>
      )}
    </div>
  );
}
