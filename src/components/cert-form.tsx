"use client";

import { useState } from "react";
import { saveCert } from "@/app/actions";
import { CountySelect } from "@/components/county-select";
import { Button, Field, inputClass } from "@/components/ui";
import { resolveCertCounty } from "@/lib/nj-counties";

type ContractorOption = { id: string; legalName: string; county: string | null };

export function CertForm({
  contractors,
  statuses,
  schoolYear,
  cert,
  defaultContractorId,
}: {
  contractors: ContractorOption[];
  statuses: Array<{ id: string; name: string }>;
  schoolYear?: string;
  cert?: {
    id: string;
    contractorId: string;
    schoolYear: string;
    county: string | null;
    statusName: string;
      notes: string | null;
    receivedDate: string;
    reviewedDate: string;
    hasLetter?: boolean;
  };
  defaultContractorId?: string;
}) {
  const startingContractor = cert?.contractorId || defaultContractorId || "";
  const startingCounty = resolveCertCounty(
    cert?.county,
    contractors.find((row) => row.id === startingContractor)?.county
  );
  const [contractorId, setContractorId] = useState(startingContractor);
  const [county, setCounty] = useState(startingCounty);
  const [countyTouched, setCountyTouched] = useState(Boolean(cert?.county));

  return (
    <form action={saveCert} className="grid gap-4 md:grid-cols-2">
      {cert ? <input type="hidden" name="id" value={cert.id} /> : null}
      <Field label="Contractor">
        <select
          className={inputClass}
          name="contractorId"
          required
          value={contractorId}
          onChange={(e) => {
            const id = e.target.value;
            setContractorId(id);
            const next = contractors.find((row) => row.id === id);
            if (!countyTouched) setCounty(next?.county || "");
          }}
        >
          <option value="">Choose a contractor</option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.legalName}
              {c.county ? ` · ${c.county}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <CountySelect
        name="county"
        required
        value={county}
        onChange={(value) => {
          setCounty(value);
          setCountyTouched(true);
        }}
        hint="Usually the same as the contractor. If they have a terminal in another county, choose that county — they need a separate cert for each county."
      />
      <Field label="School year">
        <input className={inputClass} name="schoolYear" defaultValue={cert?.schoolYear ?? schoolYear ?? ""} />
      </Field>
      <Field label="Status">
        <select className={inputClass} name="statusName" defaultValue={cert?.statusName ?? "Need review"}>
          {statuses.map((s) => (
            <option key={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Date received" hint="The day the annual certification arrived.">
        <input className={inputClass} type="date" name="receivedDate" defaultValue={cert?.receivedDate ?? ""} />
      </Field>
      <Field label="Date reviewed">
        <input className={inputClass} type="date" name="reviewedDate" defaultValue={cert?.reviewedDate ?? ""} />
      </Field>
      <Field
        label="Notes"
        className="md:col-span-2"
        hint="If approved, the date the compliance letter went out. If pending, why it is pending."
      >
        <textarea className={inputClass} name="notes" rows={3} defaultValue={cert?.notes ?? ""} />
      </Field>
      <Field
        label="Compliance letter (optional)"
        className="md:col-span-2"
        hint="Upload the annual certification compliance letter if you have it. Staff can open it from this cert. You do not have to add it."
      >
        {cert?.hasLetter ? (
          <p className="mb-2 text-sm text-muted">A letter is already on file. Upload a new file only if you need to replace it.</p>
        ) : null}
        <input className={inputClass} type="file" name="complianceLetter" accept=".pdf,.doc,.docx,image/*" />
      </Field>
      <div>
        <Button type="submit">Save cert</Button>
      </div>
    </form>
  );
}
