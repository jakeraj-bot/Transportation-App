"use client";

import { useState } from "react";
import {
  generateCertLetter,
  generateContractLetter,
  generateLabels,
  generatePt4AndEmail,
  sendDistrictEmail,
  updateChecklistItem,
} from "@/app/actions";
import { Button, Field, inputClass } from "./ui";

export function LabelButton({ contractId }: { contractId: string }) {
  const [msg, setMsg] = useState("");
  return (
    <button
      type="button"
      className="inline-flex rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] font-medium"
      onClick={async () => {
        const url = await generateLabels(contractId);
        window.open(url, "_blank");
        setMsg("Opened the folder tab and labels.");
      }}
    >
      {msg || "Print folder tab and labels"}
    </button>
  );
}

export function LetterButtons({
  kind,
  id,
  contractTypeLabel,
}: {
  kind: "contract" | "cert";
  id: string;
  contractTypeLabel?: string;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(decision: "approved" | "disapproved") {
    setBusy(true);
    const form = new FormData();
    form.set("id", id);
    form.set("kind", decision);
    form.set("letterDate", date);
    form.set("notes", notes);
    const url =
      kind === "contract" ? await generateContractLetter(form) : await generateCertLetter(form);
    window.open(url, "_blank");
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {kind === "contract" && contractTypeLabel ? (
        <p className="text-sm text-muted">
          This uses the {contractTypeLabel.toLowerCase()} approval or disapproval letter from Settings, and fills in this district’s mailing address.
        </p>
      ) : null}
      <Field label="Letter date" hint="Today is fine. Use a future date if the letter should show that date.">
        <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Note on the letter (optional)">
        <textarea className={inputClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run("approved")}
          className="rounded-xl bg-sage px-4 py-2.5 font-medium text-white"
        >
          Approve and print letter
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("disapproved")}
          className="rounded-xl bg-rose px-4 py-2.5 font-medium text-white"
        >
          Disapprove and print letter
        </button>
      </div>
    </div>
  );
}

export function ChecklistRow({
  item,
}: {
  item: { id: string; itemLabel: string; checked: boolean; comment: string | null };
}) {
  const [checked, setChecked] = useState(item.checked);
  const [comment, setComment] = useState(item.comment ?? "");

  async function save(nextChecked = checked, nextComment = comment) {
    const form = new FormData();
    form.set("id", item.id);
    form.set("checked", nextChecked ? "true" : "false");
    form.set("comment", nextComment);
    await updateChecklistItem(form);
  }

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={checked}
          onChange={async (e) => {
            setChecked(e.target.checked);
            await save(e.target.checked, comment);
          }}
        />
        <span className="font-medium">{item.itemLabel}</span>
      </label>
      <textarea
        className={`${inputClass} mt-2`}
        rows={2}
        placeholder="If something is missing or wrong, write it here. It will go on the PT-4."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onBlur={() => save(checked, comment)}
      />
    </div>
  );
}

export function Pt4Form({
  entityType,
  entityId,
  defaultTo,
  districtName,
}: {
  entityType: string;
  entityId: string;
  defaultTo?: string;
  districtName?: string;
}) {
  const [to, setTo] = useState(defaultTo || "");
  const [subject, setSubject] = useState(
    districtName ? `PT-4 additional information needed — ${districtName}` : "PT-4 additional information needed"
  );
  const [body, setBody] = useState(
    "Hello,\n\nThe Passaic County transportation office reviewed this submission and still needs the items on the attached PT-4.\n\nPlease send the missing information so we can finish the review.\n\nThank you,\nPassaic County Transportation"
  );
  const [result, setResult] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData();
        form.set("entityType", entityType);
        form.set("entityId", entityId);
        form.set("to", to);
        form.set("subject", subject);
        form.set("body", body);
        const res = await generatePt4AndEmail(form);
        setResult(
          res.status === "sent"
            ? "PT-4 emailed to the district."
            : res.error || "PT-4 was saved. Connect Outlook in Settings if you want it to send from the app."
        );
        if (res.fileUrl) window.open(res.fileUrl, "_blank");
      }}
    >
      <Field label="Send to" hint="This goes out from the county Outlook mailbox when it is connected.">
        <input className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} required />
      </Field>
      <Field label="Subject">
        <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label="Message">
        <textarea className={inputClass} rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <Button type="submit">Create PT-4 and email the district</Button>
      {result ? <p className="text-sm text-muted">{result}</p> : null}
    </form>
  );
}

export function SimpleEmailForm({
  districtId,
  defaultTo,
  subject,
  body,
  kind,
}: {
  districtId?: string;
  defaultTo?: string;
  subject: string;
  body: string;
  kind: string;
}) {
  const [to, setTo] = useState(defaultTo || "");
  const [subj, setSubj] = useState(subject);
  const [text, setText] = useState(body);
  const [result, setResult] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData();
        if (districtId) form.set("districtId", districtId);
        form.set("to", to);
        form.set("subject", subj);
        form.set("body", text);
        form.set("kind", kind);
        const res = await sendDistrictEmail(form);
        setResult(
          res.status === "sent" ? "Email sent." : res.error || "Saved as a draft until Outlook is connected."
        );
      }}
    >
      <Field label="Send to">
        <input className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} required />
      </Field>
      <Field label="Subject">
        <input className={inputClass} value={subj} onChange={(e) => setSubj(e.target.value)} />
      </Field>
      <Field label="Message">
        <textarea className={inputClass} rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Button type="submit">Send email</Button>
      {result ? <p className="text-sm text-muted">{result}</p> : null}
    </form>
  );
}

export function DeleteButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <button
      type="button"
      className="rounded-xl bg-rose-soft px-4 py-2.5 text-sm font-medium text-rose"
      onClick={async () => {
        if (confirm("Remove this? You can ask an admin to restore it from the database if needed.")) {
          await action();
        }
      }}
    >
      Remove
    </button>
  );
}
