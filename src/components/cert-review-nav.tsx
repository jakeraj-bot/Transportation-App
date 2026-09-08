"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { adjacentCerts, filterCerts, type CertListRow } from "@/lib/cert-list";
import { Button, Card, inputClass } from "@/components/ui";

export function CertReviewNav({ currentId, rows }: { currentId: string; rows: CertListRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { prev, next, position, total } = adjacentCerts(rows, currentId);
  const hits = useMemo(
    () => (submitted ? filterCerts(rows, { q: submitted }).filter((row) => row.id !== currentId) : []),
    [rows, submitted, currentId]
  );

  function search(event: FormEvent) {
    event.preventDefault();
    const term = q.trim();
    setSubmitted(term);
    if (!term) return;
    const matches = filterCerts(rows, { q: term });
    if (matches.length === 1 && matches[0].id !== currentId) {
      router.push(`/certs/${matches[0].id}`);
    }
  }

  return (
    <Card className="space-y-4">
      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-sm font-medium text-ink">Search annual certs</span>
          <input
            className={inputClass}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (!e.target.value.trim()) setSubmitted("");
            }}
            placeholder="Bus company, OSP code, county, or notes"
            aria-label="Search annual certifications"
          />
        </label>
        <Button type="submit">Search</Button>
      </form>
      {submitted && hits.length === 0 ? (
        <p className="text-sm text-muted">No other certs match “{submitted}” this school year.</p>
      ) : null}
      {hits.length > 0 ? (
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {hits.slice(0, 12).map((row) => (
            <Link
              key={row.id}
              href={`/certs/${row.id}`}
              className="block px-4 py-2.5 hover:bg-teal-soft/40"
            >
              <span className="font-medium">{row.contractorName}</span>
              <span className="text-muted">
                {row.county ? ` · ${row.county}` : ""}
                {row.ospCode || row.vendorCode ? ` · ${row.ospCode || row.vendorCode}` : ""}
                {` · ${row.statusName}`}
              </span>
            </Link>
          ))}
          {hits.length > 12 ? (
            <p className="px-4 py-2 text-sm text-muted">Showing 12 of {hits.length}. Add more words to narrow it.</p>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {total ? `${position} of ${total}` : "This school year"}
        </p>
        <div className="flex flex-wrap gap-2">
          {prev ? (
            <Button href={`/certs/${prev.id}`} variant="secondary">
              Previous
            </Button>
          ) : null}
          {next ? (
            <Button href={`/certs/${next.id}`}>
              Next{next.contractorName ? `: ${next.contractorName}` : ""}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
