"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { filterCerts, sortCerts, type CertListRow } from "@/lib/cert-list";
import { Button, Card, EmptyState, StatusChip, inputClass } from "@/components/ui";
import { certCountyOptions } from "@/lib/nj-counties";

export function CertList({
  rows,
  statuses,
  initialQ = "",
  initialStatus = "",
  initialCounty = "",
  initialOpen = false,
}: {
  rows: CertListRow[];
  statuses: Array<{ name: string; color: string }>;
  initialQ?: string;
  initialStatus?: string;
  initialCounty?: string;
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialOpen && !initialStatus ? "open" : initialStatus);
  const [county, setCounty] = useState(initialCounty);

  const counties = useMemo(() => certCountyOptions(rows.map((row) => row.county)), [rows]);
  const filtered = useMemo(
    () =>
      sortCerts(
        filterCerts(rows, {
          q,
          status: status === "open" ? "" : status,
          county,
          open: status === "open",
        })
      ),
    [rows, q, status, county]
  );
  const active = Boolean(q.trim() || status || county);

  function writeUrl(next: { q: string; status: string; county: string }) {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.status === "open") params.set("open", "1");
    else if (next.status) params.set("status", next.status);
    if (next.county) params.set("county", next.county);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function clear() {
    setQ("");
    setStatus("");
    setCounty("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block md:col-span-3">
            <span className="mb-1.5 block text-sm font-medium text-ink">Search</span>
            <input
              className={inputClass}
              value={q}
              onChange={(e) => {
                const value = e.target.value;
                setQ(value);
                writeUrl({ q: value, status, county });
              }}
              placeholder="Bus company, OSP code, county, or notes"
              aria-label="Search annual certifications"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Status</span>
            <select
              className={inputClass}
              value={status}
              onChange={(e) => {
                const value = e.target.value;
                setStatus(value);
                writeUrl({ q, status: value, county });
              }}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="open">Not approved yet</option>
              {statuses.map((row) => (
                <option key={row.name} value={row.name}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">County</span>
            <select
              className={inputClass}
              value={county}
              onChange={(e) => {
                const value = e.target.value;
                setCounty(value);
                writeUrl({ q, status, county: value });
              }}
              aria-label="Filter by county"
            >
              <option value="">All counties</option>
              {counties.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3">
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
      {filtered.length === 0 ? (
        <EmptyState
          title="No certs match"
          body="Try a different bus company, OSP code, status, or county."
          action={active ? <Button type="button" variant="secondary" onClick={clear}>Clear search</Button> : undefined}
        />
      ) : (
        <Card className="divide-y divide-line p-0">
          {filtered.map((c) => (
            <Link key={c.id} href={`/certs/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-teal-soft/40">
              <span>
                {c.contractorName}
                <span className="text-muted"> · {c.ospCode || c.vendorCode || "no code"}</span>
                {c.county ? <span className="text-muted"> · {c.county}</span> : null}
                {c.receivedDateLabel !== "—" ? <span className="text-muted"> · received {c.receivedDateLabel}</span> : null}
                {c.hasLetter ? <span className="text-muted"> · letter on file</span> : null}
                {c.notes ? <span className="mt-1 block text-sm text-muted">{c.notes}</span> : null}
              </span>
              <StatusChip name={c.statusName} color={c.statusColor} />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
