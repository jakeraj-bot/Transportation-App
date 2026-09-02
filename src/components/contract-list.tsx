"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { generateContractLetter } from "@/app/actions";
import { StatusChip, inputClass } from "@/components/ui";

export type ContractListRow = {
  id: string;
  multiContractNumber: string;
  districtId: string;
  districtName: string;
  contractorName: string;
  contractorIncomplete?: boolean;
  type: string;
  typeLabel: string;
  statusName: string;
  rationaleNeeded: boolean;
  nextMeetingFlag: boolean;
  secondReviewHours?: number;
  routes: Array<{ id: string; number: string; hasAddendum: boolean }>;
};

export function ContractList({ rows, canApprove }: { rows: ContractListRow[]; canApprove: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const picked = rows.filter((row) => selected.includes(row.id));
  const sameType = picked.length > 0 && picked.every((row) => row.type === picked[0].type && row.districtId === picked[0].districtId);
  const message = useMemo(() => {
    if (picked.length < 2) return "";
    if (!sameType) return "To print one letter, pick contracts from the same district and the same type.";
    return `${picked.length} ${picked[0].districtName} ${picked[0].typeLabel.toLowerCase()} contracts will print on one letter, one row each.`;
  }, [picked, sameType]);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
    setError("");
  }

  async function approve() {
    if (!sameType || picked.length < 2) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("kind", "approved");
      form.set("letterDate", date);
      for (const row of picked) form.append("ids", row.id);
      const url = await generateContractLetter(form);
      window.open(url, "_blank");
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make that letter.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {canApprove && picked.length > 0 ? (
        <div className="rounded-2xl border border-line bg-card px-5 py-4">
          <p className="text-sm text-muted">{message || "Pick two or more contracts of the same type in the same district."}</p>
          {sameType && picked.length >= 2 ? (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Letter date</span>
                <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={approve}
                className="rounded-xl bg-sage px-4 py-2.5 font-medium text-white disabled:opacity-60"
              >
                {busy ? "Making letter…" : `Approve ${picked.length} and print one letter`}
              </button>
            </div>
          ) : null}
          {error ? <p className="mt-2 text-sm text-rose">{error}</p> : null}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-2xl bg-card shadow-[0_1px_0_rgba(44,58,71,0.04),0_12px_32px_rgba(44,58,71,0.06)]">
        <table className="w-full text-left">
          <thead className="border-b border-line text-sm text-muted">
            <tr>
              {canApprove ? <th className="px-5 py-3 font-medium">Letter</th> : null}
              <th className="px-5 py-3 font-medium">Multi-contract</th>
              <th className="px-5 py-3 font-medium">District</th>
              <th className="px-5 py-3 font-medium">Contractor</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Routes</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line/70">
                {canApprove ? (
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={selected.includes(c.id)}
                      onChange={() => toggle(c.id)}
                      aria-label={`Include ${c.multiContractNumber} on a letter`}
                    />
                  </td>
                ) : null}
                <td className="px-5 py-3">
                  <Link className="text-teal hover:underline" href={`/contracts/${c.id}`}>
                    {c.multiContractNumber}
                  </Link>
                  {c.rationaleNeeded ? <div className="text-xs text-rose">Needs rationale letter</div> : null}
                  {c.nextMeetingFlag ? <div className="text-xs text-amber">Next-meeting flag</div> : null}
                  {c.statusName === "2nd review" && c.secondReviewHours != null ? (
                    <div className="text-xs text-muted">In 2nd review {Math.max(1, Math.round(c.secondReviewHours))}h</div>
                  ) : null}
                </td>
                <td className="px-5 py-3">{c.districtName}</td>
                <td className={`px-5 py-3 ${c.contractorIncomplete ? "text-rose" : ""}`}>
                  {c.contractorName}
                  {c.contractorIncomplete ? <div className="text-xs">Needs contractor details</div> : null}
                </td>
                <td className="px-5 py-3">{c.typeLabel}</td>
                <td className="px-5 py-3">
                  {c.routes.map((r, index) => (
                    <span key={r.id}>
                      <Link className="text-teal hover:underline" href={`/contracts/${c.id}/routes/${r.id}`}>
                        {r.number}
                      </Link>
                      {r.hasAddendum ? " · addendum" : ""}
                      {index < c.routes.length - 1 ? ", " : ""}
                    </span>
                  ))}
                  {c.routes.length === 0 ? "—" : null}
                </td>
                <td className="px-5 py-3">
                  <StatusChip name={c.statusName} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
