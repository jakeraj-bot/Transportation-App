"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setRationaleDecision } from "@/app/actions";
import { Flag, inputClass } from "@/components/ui";

export function RationaleFlag({
  contractId,
  receivedLabel,
  boardLabel,
  days,
  waived,
  note,
  canEdit,
}: {
  contractId: string;
  receivedLabel: string;
  boardLabel: string;
  days: number;
  waived: boolean;
  note: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [ok, setOk] = useState(waived);
  const [text, setText] = useState(note);
  const [message, setMessage] = useState("");

  async function save(nextOk: boolean, nextNote: string) {
    setMessage("Saving…");
    const form = new FormData();
    form.set("id", contractId);
    if (nextOk) form.set("ok", "on");
    form.set("note", nextNote);
    await setRationaleDecision(form);
    setMessage(nextOk ? "Marked OK. A rationale letter is not needed for this contract." : "The rationale letter flag is back on.");
    router.refresh();
  }

  return (
    <Flag tone={ok ? "sage" : "rose"}>
      <p>
        Received {receivedLabel}, which is {days} day{days === 1 ? "" : "s"} after the {boardLabel} board meeting.
        {ok
          ? " Marked OK. A rationale letter is not needed for this contract."
          : " Ask the district for a rationale letter."}
        {ok && text.trim() ? ` ${text.trim()}` : ""}
      </p>
      {canEdit ? (
        <div className="mt-3 space-y-2">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1 size-4"
              checked={ok}
              onChange={async (event) => {
                const next = event.target.checked;
                setOk(next);
                await save(next, text);
              }}
            />
            <span>OK. Do not need a rationale letter.</span>
          </label>
          <input
            className={inputClass}
            value={text}
            placeholder="Weekend, closure, or why this one is fine"
            onChange={(event) => setText(event.target.value)}
            onBlur={() => {
              if (ok && text.trim() !== note.trim()) void save(true, text);
            }}
          />
          <p className="text-xs text-muted">
            This is only for this contract and these dates. Other packets that arrive 30 or more days late still ask for a letter. Changing the received date or the board meeting date brings this flag back.
          </p>
          {message ? <p className="text-xs">{message}</p> : null}
        </div>
      ) : null}
    </Flag>
  );
}
