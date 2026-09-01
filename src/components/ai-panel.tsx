"use client";

import { useState } from "react";
import { askNjAi } from "@/app/actions";

export function AiPanel() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    try {
      setAnswer(await askNjAi(question.trim()));
    } catch {
      setAnswer("I could not answer that just now. Try again, or check the N.J.A.C. 6A:27 PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 rounded-full bg-teal px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-teal-dark"
      >
        Ask NJ transportation
      </button>
      {open ? (
        <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-line bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <p className="serif text-xl">NJ transportation help</p>
              <p className="text-sm text-muted">Answers from N.J.A.C. 6A:27 and N.J.S.A. 18A:39</p>
            </div>
            <button type="button" className="text-muted" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <div className="flex-1 overflow-auto px-5 py-4">
            {answer ? (
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{answer}</div>
            ) : (
              <p className="text-muted">
                Try: “Can a quote be renewed?” or “What must be on an insurance certificate?”
              </p>
            )}
          </div>
          <form onSubmit={onAsk} className="border-t border-line p-4">
            <textarea
              className="mb-3 w-full rounded-xl border border-line px-3 py-2"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a transportation question"
            />
            <button
              className="w-full rounded-xl bg-teal py-2.5 text-white disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              {busy ? "Looking it up…" : "Ask"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
