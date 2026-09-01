"use client";

import { useMemo, useState } from "react";
import { saveContractor } from "@/app/actions";
import { Button, Field, inputClass } from "@/components/ui";
import { brcSearchUrl, nameControlFrom } from "@/lib/utils";

type Values = {
  legalName?: string | null;
  dba?: string | null;
  vendorCode?: string | null;
  ospCode?: string | null;
  busLocation?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  brcNumber?: string | null;
  brcNameControl?: string | null;
  brcStatus?: string | null;
  debarred?: boolean | null;
  notes?: string | null;
};

export function ContractorForm({ id, values }: { id?: string; values?: Values }) {
  const [legalName, setLegalName] = useState(values?.legalName ?? "");
  const [nameControl, setNameControl] = useState(
    values?.brcNameControl || nameControlFrom(values?.legalName ?? "")
  );
  const [certNumber, setCertNumber] = useState(values?.brcNumber ?? "");
  const autoControl = useMemo(() => nameControlFrom(legalName), [legalName]);

  return (
    <form action={saveContractor} className="grid gap-4 md:grid-cols-2">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <Field label="Legal / taxpayer name">
        <input
          className={inputClass}
          name="legalName"
          required
          value={legalName}
          onChange={(e) => {
            setLegalName(e.target.value);
            if (!values?.brcNameControl) setNameControl(nameControlFrom(e.target.value));
          }}
        />
      </Field>
      <Field label="Doing business as">
        <input className={inputClass} name="dba" defaultValue={values?.dba ?? ""} />
      </Field>
      <Field label="Vendor code">
        <input className={inputClass} name="vendorCode" defaultValue={values?.vendorCode ?? ""} />
      </Field>
      <Field label="Office of Student Protection code">
        <input className={inputClass} name="ospCode" defaultValue={values?.ospCode ?? ""} />
      </Field>
      <Field label="Bus location">
        <input className={inputClass} name="busLocation" defaultValue={values?.busLocation ?? ""} />
      </Field>
      <Field label="Contact name">
        <input className={inputClass} name="contactName" defaultValue={values?.contactName ?? ""} />
      </Field>
      <Field label="Phone">
        <input className={inputClass} name="phone" defaultValue={values?.phone ?? ""} />
      </Field>
      <Field label="Email">
        <input className={inputClass} name="email" defaultValue={values?.email ?? ""} />
      </Field>
      <Field label="BRC certificate number" hint="From the Business Registration Certificate.">
        <input
          className={inputClass}
          name="brcNumber"
          value={certNumber}
          onChange={(e) => setCertNumber(e.target.value)}
        />
      </Field>
      <Field
        label="Taxpayer name — first 4 letters"
        hint="Filled from the contractor name. Change it only if the BRC uses a different taxpayer name."
      >
        <input
          className={inputClass}
          name="brcNameControl"
          value={nameControl}
          onChange={(e) => setNameControl(e.target.value.toUpperCase().slice(0, 4))}
        />
      </Field>
      <Field label="BRC status">
        <select className={inputClass} name="brcStatus" defaultValue={values?.brcStatus ?? "Not on file"}>
          <option>Not on file</option>
          <option>Valid</option>
          <option>Could not verify</option>
        </select>
      </Field>
      <div className="rounded-xl border border-line bg-cream px-4 py-3 md:col-span-2">
        <p className="text-sm text-muted">
          New Jersey’s Treasury site will not let us type into their form for you. This button opens the search and copies the two values so you can paste them and hit Submit.
        </p>
        <p className="mt-2 font-medium">Name control: {nameControl || autoControl || "—"} · Certificate: {certNumber || "—"}</p>
        <BrcSearchButton nameControl={nameControl || autoControl} certificateNumber={certNumber} />
      </div>
      <label className="flex items-center gap-2 pt-2">
        <input type="checkbox" name="markVerified" />
        <span>I just checked the Treasury site — mark verified today</span>
      </label>
      <label className="flex items-center gap-2 pt-2">
        <input type="checkbox" name="debarred" defaultChecked={Boolean(values?.debarred)} />
        <span>Flag as debarred</span>
      </label>
      <Field label="Notes" className="md:col-span-2">
        <textarea className={inputClass} name="notes" rows={3} defaultValue={values?.notes ?? ""} />
      </Field>
      <div>
        <Button type="submit">Save contractor</Button>
      </div>
    </form>
  );
}

function BrcSearchButton({
  nameControl,
  certificateNumber,
}: {
  nameControl: string;
  certificateNumber: string;
}) {
  const [copied, setCopied] = useState("");
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white"
        onClick={async () => {
          const text = `Taxpayer name (first 4 letters): ${nameControl}\nCertificate number: ${certificateNumber}`;
          try {
            await navigator.clipboard.writeText(text);
            setCopied("Copied. Paste into the Treasury form, then Submit.");
          } catch {
            setCopied("Copy the values above into the Treasury form.");
          }
          window.open(brcSearchUrl(), "_blank", "noreferrer");
        }}
      >
        Open BRC search
      </button>
      <button
        type="button"
        className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm"
        onClick={async () => {
          await navigator.clipboard.writeText(nameControl);
          setCopied("Name control copied.");
        }}
      >
        Copy name control
      </button>
      <button
        type="button"
        className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm"
        onClick={async () => {
          await navigator.clipboard.writeText(certificateNumber);
          setCopied("Certificate number copied.");
        }}
      >
        Copy certificate number
      </button>
      {copied ? <p className="w-full text-sm text-teal">{copied}</p> : null}
    </div>
  );
}
