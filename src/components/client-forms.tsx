"use client";

import { useMemo, useState } from "react";
import {
  generateCertLetter,
  generateContractLetter,
  generatePrintPacket,
  generatePt4AndEmail,
  sendDistrictEmail,
  updateChecklistItem,
} from "@/app/actions";
import { groupByLetter, type LetterGroupInput } from "@/lib/letter-groups";
import { Button, Field, inputClass } from "./ui";

export function LabelButton({ contractId }: { contractId: string }) {
  const [msg, setMsg] = useState("");
  async function print(kind: "tab" | "label" | "both") {
    const form = new FormData();
    form.append("ids", contractId);
    form.set("kind", kind);
    const url = await generatePrintPacket(form);
    window.open(url, "_blank");
    setMsg(kind === "tab" ? "Opened the folder tab." : kind === "label" ? "Opened the label." : "Opened the folder tab and labels.");
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="inline-flex rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] font-medium"
        onClick={() => print("tab")}
      >
        Print folder tab
      </button>
      <button
        type="button"
        className="inline-flex rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] font-medium"
        onClick={() => print("label")}
      >
        Print label
      </button>
      <button
        type="button"
        className="inline-flex rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] font-medium"
        onClick={() => print("both")}
      >
        {msg || "Print both"}
      </button>
    </div>
  );
}

export function LetterButtons({
  kind,
  id,
  contractTypeLabel,
  contractType,
  letterGroup,
  sameTypeContracts,
}: {
  kind: "contract" | "cert";
  id: string;
  contractTypeLabel?: string;
  contractType?: string;
  letterGroup?: LetterGroupInput;
  sameTypeContracts?: Array<{
    id: string;
    multiContractNumber: string;
    contractorName: string;
    hostName?: string | null;
    joinerDistricts?: string | null;
    receivedDateLabel?: string | null;
    letterGroup?: LetterGroupInput;
    sameLetterGroup?: boolean;
  }>;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const extras = sameTypeContracts?.filter((row) => row.id !== id) ?? [];
  const [included, setIncluded] = useState<string[]>(extras.filter((row) => row.sameLetterGroup).map((row) => row.id));
  const letterCount = useMemo(() => {
    if (kind !== "contract" || !letterGroup) return 1;
    const selected = extras.filter((row) => included.includes(row.id));
    return groupByLetter([letterGroup, ...selected.map((row) => row.letterGroup ?? letterGroup)], (row) => row).length;
  }, [kind, letterGroup, extras, included]);

  async function run(decision: "approved" | "disapproved") {
    setBusy(true);
    const form = new FormData();
    form.set("id", id);
    form.set("kind", decision);
    form.set("letterDate", date);
    form.set("notes", notes);
    form.append("ids", id);
    for (const extraId of included) form.append("ids", extraId);
    const url =
      kind === "contract" ? await generateContractLetter(form) : await generateCertLetter(form);
    window.open(url, "_blank");
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {kind === "contract" && contractTypeLabel ? (
        <p className="text-sm text-muted">
          {contractType === "joint"
            ? "Joint agreements go on the same letter only when the host, joiner, and date received all match. Different combinations print as separate letters."
            : `This uses the ${contractTypeLabel.toLowerCase()} approval or disapproval letter from Settings, and fills in this district’s mailing address.`}
          {extras.length && contractType !== "joint"
            ? ` Check other ${contractTypeLabel.toLowerCase()} contracts for this district to put them on the same letter, one row each.`
            : extras.length
              ? " Check others below. Matching host/joiner/date stay on this letter; the rest get their own."
              : ""}
        </p>
      ) : null}
      {extras.length ? (
        <div className="space-y-2 rounded-xl border border-line bg-cream px-4 py-3">
          <p className="text-sm font-medium">{contractType === "joint" ? "Other joint agreements" : "Also include on this letter"}</p>
          {extras.map((row) => (
            <label key={row.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={included.includes(row.id)}
                onChange={(e) => {
                  setIncluded((current) =>
                    e.target.checked ? [...current, row.id] : current.filter((value) => value !== row.id)
                  );
                }}
              />
              <span>
                <span className="font-medium">{row.multiContractNumber}</span>
                <span className="text-muted"> · {row.contractorName}</span>
                {contractType === "joint" ? (
                  <span className="block text-muted">
                    Host {row.hostName || "—"} · Joiner {row.joinerDistricts || "—"} · Received {row.receivedDateLabel || "—"}
                    {row.sameLetterGroup ? " · same letter" : " · separate letter"}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
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
          {included.length
            ? letterCount > 1
              ? `Approve ${included.length + 1} contracts and print ${letterCount} letters`
              : `Approve ${included.length + 1} contracts and print letter`
            : "Approve and print letter"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("disapproved")}
          className="rounded-xl bg-rose px-4 py-2.5 font-medium text-white"
        >
          {included.length
            ? letterCount > 1
              ? `Disapprove ${included.length + 1} contracts and print ${letterCount} letters`
              : `Disapprove ${included.length + 1} contracts and print letter`
            : "Disapprove and print letter"}
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
