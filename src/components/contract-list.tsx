"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { generateContractLetter } from "@/app/actions";
import { Card, EmptyState, StatusChip, inputClass } from "@/components/ui";
import { filterContracts } from "@/lib/contract-list";
import { openGeneratedFile } from "@/lib/open-generated-file";
import { groupByLetter } from "@/lib/letter-groups";
import { CONTRACT_TYPES } from "@/lib/utils";

export type ContractListRow = {
  id: string;
  multiContractNumber: string;
  districtId: string;
  districtName: string;
  contractorName: string;
  contractorIds: string[];
  contractorIncomplete?: boolean;
  type: string;
  typeLabel: string;
  statusName: string;
  statusColor?: string;
  rationaleNeeded: boolean;
  nextMeetingFlag: boolean;
  secondReviewWait?: string;
  secondReviewerName?: string;
  hostDistrictId?: string | null;
  hostName?: string | null;
  joinerDistricts?: string | null;
  receivedDate?: string | null;
  receivedDateLabel?: string | null;
  schoolYear?: string;
  jointNote?: string;
  routes: Array<{ id: string; number: string; hasAddendum: boolean; cancelled?: boolean }>;
};

const FILTER_KEYS = ["receivedFrom", "receivedTo", "district", "contractor", "type", "status"] as const;

export function ContractList({
  rows,
  canApprove,
  districts,
  contractors,
  statuses,
  initialReceivedFrom = "",
  initialReceivedTo = "",
  initialDistrict = "",
  initialContractor = "",
  initialType = "",
  initialStatus = "",
}: {
  rows: ContractListRow[];
  canApprove: boolean;
  districts: Array<{ id: string; name: string }>;
  contractors: Array<{ id: string; name: string }>;
  statuses: Array<{ name: string }>;
  initialReceivedFrom?: string;
  initialReceivedTo?: string;
  initialDistrict?: string;
  initialContractor?: string;
  initialType?: string;
  initialStatus?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [receivedFrom, setReceivedFrom] = useState(initialReceivedFrom);
  const [receivedTo, setReceivedTo] = useState(initialReceivedTo);
  const [districtId, setDistrictId] = useState(initialDistrict);
  const [contractorId, setContractorId] = useState(initialContractor);
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState(initialStatus);
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  useEffect(() => {
    setReceivedFrom(initialReceivedFrom);
    setReceivedTo(initialReceivedTo);
    setDistrictId(initialDistrict);
    setContractorId(initialContractor);
    setType(initialType);
    setStatus(initialStatus);
  }, [initialReceivedFrom, initialReceivedTo, initialDistrict, initialContractor, initialType, initialStatus]);

  const filters = { receivedFrom, receivedTo, districtId, contractorId, type, status };
  const filtered = useMemo(
    () =>
      filterContracts(rows, {
        receivedFrom,
        receivedTo,
        districtId,
        contractorId,
        type,
        status,
      }),
    [rows, receivedFrom, receivedTo, districtId, contractorId, type, status]
  );
  const active = Boolean(receivedFrom || receivedTo || districtId || contractorId || type || status);

  function writeUrl(next: typeof filters) {
    const params = new URLSearchParams(window.location.search);
    for (const key of FILTER_KEYS) params.delete(key);
    if (next.status !== "2nd review") params.delete("reviewer");
    if (next.receivedFrom) params.set("receivedFrom", next.receivedFrom);
    if (next.receivedTo) params.set("receivedTo", next.receivedTo);
    if (next.districtId) params.set("district", next.districtId);
    if (next.contractorId) params.set("contractor", next.contractorId);
    if (next.type) params.set("type", next.type);
    if (next.status) params.set("status", next.status);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function apply(next: Partial<typeof filters>) {
    const value = { ...filters, ...next };
    setReceivedFrom(value.receivedFrom);
    setReceivedTo(value.receivedTo);
    setDistrictId(value.districtId);
    setContractorId(value.contractorId);
    setType(value.type);
    setStatus(value.status);
    writeUrl(value);
  }

  function clear() {
    apply({ receivedFrom: "", receivedTo: "", districtId: "", contractorId: "", type: "", status: "" });
  }

  const picked = filtered.filter((row) => selected.includes(row.id));
  const sameType =
    picked.length > 0 &&
    picked.every((row) => row.type === picked[0].type) &&
    (picked[0].type === "joint" || picked.every((row) => row.districtId === picked[0].districtId));
  const letterCount = sameType
    ? groupByLetter(picked, (row) => ({
        type: row.type,
        districtId: row.districtId,
        schoolYear: row.schoolYear || "",
        hostDistrictId: row.hostDistrictId,
        joinerDistricts: row.joinerDistricts,
        receivedDate: row.receivedDate,
      })).length
    : 0;
  const message = useMemo(() => {
    if (picked.length < 2) return "";
    if (!sameType) return "To print letters together, pick contracts of the same type. Non-joint packets also need the same district.";
    if (picked[0].type === "joint" && letterCount > 1) {
      return `${picked.length} joint agreements will print as ${letterCount} letters, grouped by host, joiner, and date received.`;
    }
    return `${picked.length} ${picked[0].districtName} ${picked[0].typeLabel.toLowerCase()} contracts will print on one letter, one row each.`;
  }, [picked, sameType, letterCount]);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
    setError("");
  }

  async function approve() {
    if (!sameType || picked.length < 2) return;
    setBusy(true);
    setError("");
    setFileUrl("");
    try {
      const form = new FormData();
      form.set("kind", "approved");
      form.set("letterDate", date);
      for (const row of picked) form.append("ids", row.id);
      const res = await generateContractLetter(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFileUrl(res.url);
      if (res.warning) setError(res.warning);
      openGeneratedFile(res.url);
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make that letter.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Received from</span>
            <input
              className={inputClass}
              type="date"
              value={receivedFrom}
              aria-label="Received from"
              onChange={(event) => apply({ receivedFrom: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Received through</span>
            <input
              className={inputClass}
              type="date"
              value={receivedTo}
              aria-label="Received through"
              onChange={(event) => apply({ receivedTo: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">District</span>
            <select
              className={inputClass}
              value={districtId}
              aria-label="Filter by district"
              onChange={(event) => apply({ districtId: event.target.value })}
            >
              <option value="">All districts</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Contractor</span>
            <select
              className={inputClass}
              value={contractorId}
              aria-label="Filter by contractor"
              onChange={(event) => apply({ contractorId: event.target.value })}
            >
              <option value="">All contractors</option>
              {contractors.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Type</span>
            <select
              className={inputClass}
              value={type}
              aria-label="Filter by type"
              onChange={(event) => apply({ type: event.target.value })}
            >
              <option value="">All types</option>
              {CONTRACT_TYPES.map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Status</span>
            <select
              className={inputClass}
              value={status}
              aria-label="Filter by status"
              onChange={(event) => apply({ status: event.target.value })}
            >
              <option value="">All statuses</option>
              {statuses.map((row) => (
                <option key={row.name} value={row.name}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3 md:col-span-3">
            <p className="text-sm text-muted">
              Showing {filtered.length} of {rows.length}
            </p>
            {active ? (
              <button type="button" className="text-sm text-teal hover:underline" onClick={clear}>
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </Card>
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
                {busy ? "Making letter…" : letterCount > 1 ? `Approve ${picked.length} and print ${letterCount} letters` : `Approve ${picked.length} and print one letter`}
              </button>
            </div>
          ) : null}
          {error ? <p className="mt-2 text-sm text-rose">{error}</p> : null}
          {fileUrl ? (
            <p className="mt-2 text-sm text-muted">
              If nothing opened,{" "}
              <a className="text-teal hover:underline" href={fileUrl}>
                download the letter here
              </a>
              .
            </p>
          ) : null}
        </div>
      ) : null}
      {filtered.length === 0 ? (
        <EmptyState
          title="No contracts match"
          body="Try a different date received, district, contractor, type, or status."
        />
      ) : null}
      {filtered.length > 0 ? (
      <div className="overflow-x-auto rounded-2xl bg-card shadow-[0_1px_0_rgba(44,58,71,0.04),0_12px_32px_rgba(44,58,71,0.06)]">
        <table className="w-full text-left">
          <thead className="border-b border-line text-sm text-muted">
            <tr>
              {canApprove ? <th className="px-5 py-3 font-medium">Letter</th> : null}
              <th className="px-5 py-3 font-medium">Multi-contract</th>
              <th className="px-5 py-3 font-medium">District</th>
              <th className="px-5 py-3 font-medium">Contractor</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Received</th>
              <th className="px-5 py-3 font-medium">Routes</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
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
                    {c.type === "joint"
                      ? `Routes ${c.routes.filter((route) => !route.cancelled).map((route) => route.number).join(", ") || "—"}`
                      : c.multiContractNumber}
                  </Link>
                  {c.jointNote ? <div className="text-xs text-teal">{c.jointNote}</div> : null}
                  {c.rationaleNeeded ? <div className="text-xs text-rose">Needs rationale letter</div> : null}
                  {c.nextMeetingFlag ? <div className="text-xs text-amber">Next-meeting flag</div> : null}
                  {c.statusName === "2nd review" && c.secondReviewWait ? (
                    <div className="text-xs text-muted">
                      In 2nd review {c.secondReviewWait}
                      {c.secondReviewerName ? ` · ${c.secondReviewerName}` : ""}
                    </div>
                  ) : null}
                </td>
                <td className="px-5 py-3">
                  {c.districtName}
                  {c.type === "joint" ? (
                    <div className="text-xs text-muted">
                      Host {c.hostName || "—"} · Joiner {c.joinerDistricts || "—"} · Received {c.receivedDateLabel || "—"}
                    </div>
                  ) : null}
                </td>
                <td className={`px-5 py-3 ${c.contractorIncomplete ? "text-rose" : ""}`}>
                  {c.contractorName}
                  {c.contractorIncomplete ? <div className="text-xs">Needs contractor details</div> : null}
                </td>
                <td className="px-5 py-3">{c.typeLabel}</td>
                <td className="px-5 py-3">{c.receivedDateLabel || "—"}</td>
                <td className="px-5 py-3">
                  {c.routes.map((r, index) => (
                    <span key={r.id} className={r.cancelled ? "text-muted line-through" : undefined}>
                      <Link className="text-teal hover:underline" href={`/contracts/${c.id}/routes/${r.id}`}>
                        {r.number}
                      </Link>
                      {r.cancelled ? " · cancelled" : ""}
                      {r.hasAddendum ? " · addendum" : ""}
                      {index < c.routes.length - 1 ? ", " : ""}
                    </span>
                  ))}
                  {c.routes.length === 0 ? "—" : null}
                </td>
                <td className="px-5 py-3">
                  <StatusChip name={c.statusName} color={c.statusColor} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : null}
    </div>
  );
}
