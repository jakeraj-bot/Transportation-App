"use client";

import { useState } from "react";
import { uploadTemplate } from "@/app/actions";
import { Button, inputClass } from "@/components/ui";

export function TemplateUploadForm({
  templateKey,
  label,
  hint,
  originalName,
}: {
  templateKey: string;
  label: string;
  hint: string;
  originalName?: string;
}) {
  const [name, setName] = useState(originalName);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid gap-2 rounded-xl border border-line p-4 md:grid-cols-[1fr_auto_auto] md:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        setError("");
        try {
          const res = await uploadTemplate(new FormData(e.currentTarget));
          if (res.ok) {
            setName(res.originalName);
            setMessage("Saved. Stay here — this letter will be used the next time you print.");
          } else {
            setError(res.error);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save that letter.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <input type="hidden" name="key" value={templateKey} />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted">{name ? `Current file: ${name}` : hint}</p>
        {message ? <p className="mt-1 text-sm text-sage">{message}</p> : null}
        {error ? <p className="mt-1 text-sm text-rose">{error}</p> : null}
      </div>
      <input className={inputClass} type="file" name="file" accept=".docx" required />
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Upload"}</Button>
    </form>
  );
}
