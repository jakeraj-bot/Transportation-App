"use client";

import { useMemo, useState } from "react";
import { generateContractLetter, generatePrintPacket } from "@/app/actions";
import { inputClass } from "@/components/ui";
import { contractTypeLabel } from "@/lib/utils";

export type BatchContractRow = {
  id: string;
  multiContractNumber: string;
  districtId: string;
  districtName: string;
  contractorName: string;
  type: string;
  typeLabel: string;
  statusName: string;
  routeSummary?: string;
};

export function BatchContractPicker({
  rows,
  mode,
}: {
  rows: BatchContractRow[];
  mode: "approve" | "tabs" | "labels";
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const picked = rows.filter((row) => selected.includes(row.id));
  const grouped = useMemo(() => {
    const map = new Map<string, BatchContractRow[]>();
    for (const row of rows) {
      const list = map.get(row.type) ?? [];
      list.push(row);
      map.set(row.type, list);
    }
    return Array.from(map.entries());
  }, [rows]);

  const sameType =
    picked.length > 0 &&
    picked.every((row) => row.type === picked[0].type && row.districtId === picked[0].districtId);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
    setError("");
  }

  async function run() {
    if (!picked.length) return;
    if (mode === "approve" && !sameType) {
      setError("Pick contracts from the same district and the same type for one approval letter.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      for (const row of picked) form.append("ids", row.id);
      if (mode === "approve") {
        form.set("kind", "approved");
        form.set("letterDate", date);
        const url = await generateContractLetter(form);
        window.open(url, "_blank");
      } else {
        form.set("kind", mode === "tabs" ? "tab" : "label");
        const url = await generatePrintPacket(form);
        window.open(url, "_blank");
      }
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  const button =
    mode === "approve"
      ? picked.length
        ? `Create approval letter for ${picked.length}`
        : "Create approval letter"
      : mode === "tabs"
        ? picked.length
          ? `Print ${picked.length} folder tab${picked.length === 1 ? "" : "s"}`
          : "Print folder tabs"
        : picked.length
          ? `Print ${picked.length} label${picked.length === 1 ? "" : "s"}`
          : "Print labels";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-card px-5 py-4">
        <p className="text-sm text-muted">
          {mode === "approve"
            ? "Click the contracts to include. They must be the same type and the same district so they can share one letter."
            : "Click the contracts that still need this printed. You can print several at once."}
        </p>
        {mode === "approve" ? (
          <label className="mt-3 block max-w-xs">
            <span className="mb-1.5 block text-sm font-medium">Letter date</span>
            <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        ) : null}
        <button
          type="button"
          disabled={busy || picked.length === 0}
          onClick={run}
          className="mt-3 rounded-xl bg-sage px-4 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {busy ? "Working…" : button}
        </button>
        {error ? <p className="mt-2 text-sm text-rose">{error}</p> : null}
      </div>
      {grouped.map(([type, list]) => (
        <section key={type} className="overflow-hidden rounded-2xl bg-card shadow-[0_1px_0_rgba(44,58,71,0.04),0_12px_32px_rgba(44,58,71,0.06)]">
          <h2 className="serif border-b border-line px-5 py-4 text-2xl">
            {contractTypeLabel(type)}
            <span className="ml-2 text-base font-sans text-muted">{list.length}</span>
          </h2>
          <ul>
            {list.map((row) => (
              <li key={row.id} className="border-b border-line/70 last:border-0">
                <label className="flex cursor-pointer items-start gap-3 px-5 py-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={selected.includes(row.id)}
                    onChange={() => toggle(row.id)}
                  />
                  <span>
                    <span className="font-medium">{row.multiContractNumber}</span>
                    <span className="text-muted">
                      {" "}
                      · {row.districtName} · {row.contractorName} · {row.typeLabel} · {row.statusName}
                    </span>
                    {row.routeSummary ? <span className="block text-sm text-muted">Routes: {row.routeSummary}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
