"use client";

import { useState } from "react";
import { polishDistrictEmail, sendDistrictEmail } from "@/app/actions";
import { Button, Field, inputClass } from "@/components/ui";

function mailtoHref(to: string, subject: string, body: string) {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${to}?${params.toString()}`;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function EmailDraftForm({
  districtId,
  defaultTo,
  subject,
  body,
  kind,
  canSend,
  hint,
}: {
  districtId?: string;
  defaultTo?: string;
  subject: string;
  body: string;
  kind: string;
  canSend?: boolean;
  hint?: string;
}) {
  const [to, setTo] = useState(defaultTo || "");
  const [subj, setSubj] = useState(subject);
  const [text, setText] = useState(body);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  async function copyMessage() {
    await copyText(text);
    setResult("Message copied. Paste it into your work email.");
  }

  async function copyAll() {
    await copyText(`To: ${to}\nSubject: ${subj}\n\n${text}`);
    setResult("To, subject, and message copied. Paste them into your work email.");
  }

  async function polish() {
    setBusy(true);
    setResult("");
    try {
      const form = new FormData();
      form.set("subject", subj);
      form.set("body", text);
      form.set("kind", kind);
      const res = await polishDistrictEmail(form);
      setSubj(res.subject);
      setText(res.body);
      setResult(res.note || "Rewrote the draft. Read it, then copy it into your work email.");
    } catch {
      setResult("Could not rewrite the email just now.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setResult("");
    try {
      const form = new FormData();
      if (districtId) form.set("districtId", districtId);
      form.set("to", to);
      form.set("subject", subj);
      form.set("body", text);
      form.set("kind", kind);
      const res = await sendDistrictEmail(form);
      setResult(res.status === "sent" ? "Email sent from the county mailbox." : res.error || "Saved as a draft.");
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {hint ||
          "The state has not given this office mailbox access, so the app cannot send from here. Prepare the email, then copy it into your work Outlook."}
      </p>
      <Field label="Send to" hint="The district transportation email, if we have it on file.">
        <input className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
      </Field>
      <Field label="Subject">
        <input className={inputClass} value={subj} onChange={(e) => setSubj(e.target.value)} />
      </Field>
      <Field label="Message">
        <textarea className={inputClass} rows={8} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={copyMessage}>
          Copy message
        </Button>
        <Button type="button" variant="secondary" onClick={copyAll}>
          Copy to, subject, and message
        </Button>
        <a
          className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] font-medium"
          href={mailtoHref(to, subj, text)}
        >
          Open in your email app
        </a>
        <Button type="button" variant="secondary" onClick={polish} disabled={busy}>
          {busy ? "Rewriting…" : "Rewrite with AI"}
        </Button>
        {canSend ? (
          <Button type="button" variant="secondary" onClick={send}>
            Send from county mailbox
          </Button>
        ) : null}
      </div>
      {result ? <p className="text-sm text-muted">{result}</p> : null}
    </div>
  );
}
