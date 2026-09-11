import { Button, Field, inputClass } from "@/components/ui";
import { NJ_COUNTIES } from "@/lib/nj-counties";
import { CONTRACT_TYPES } from "@/lib/utils";

export function CurrentContractForm({
  action,
  schoolYear,
  districts,
  contractors,
  statuses,
  reviewers,
  values,
  submitLabel,
  allowNewContractor = false,
  extraActions,
}: {
  action: (form: FormData) => void | Promise<void>;
  schoolYear: string;
  districts: Array<{ id: string; name: string }>;
  contractors: Array<{ id: string; legalName: string; incomplete?: boolean }>;
  statuses: Array<{ id: string; name: string }>;
  reviewers: Array<{ id: string; name: string }>;
  values?: {
    id?: string;
    receivedDate?: string;
    schoolYear?: string;
    districtId?: string;
    contractorId?: string;
    type?: string;
    multiContractNumber?: string;
    routes?: string;
    bidNumber?: string;
    statusName?: string;
    firstReviewerId?: string;
    secondReviewerId?: string;
    sentToDistrictAt?: string;
    insuranceExpiresAt?: string;
    notes?: string;
  };
  submitLabel: string;
  allowNewContractor?: boolean;
  extraActions?: React.ReactNode;
}) {
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <Field label="Date received">
        <input className={inputClass} type="date" name="receivedDate" defaultValue={values?.receivedDate ?? ""} />
      </Field>
      <Field label="School year">
        <input className={inputClass} name="schoolYear" required defaultValue={values?.schoolYear ?? schoolYear} />
      </Field>
      <Field label="District">
        <select className={inputClass} name="districtId" required defaultValue={values?.districtId ?? ""}>
          <option value="">Choose a district</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Bus company" hint={allowNewContractor ? "Choose one from the tracker, or type a new name below." : undefined}>
        <select className={inputClass} name="contractorId" defaultValue={values?.contractorId ?? ""} required={!allowNewContractor}>
          <option value="">Choose a bus company</option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.incomplete ? `${c.legalName} (needs details)` : c.legalName}
            </option>
          ))}
        </select>
      </Field>
      {allowNewContractor ? (
        <>
          <Field label="Or type a new bus company">
            <input className={inputClass} name="newContractorName" placeholder="Only if it is not in the list yet" />
          </Field>
          <Field label="County for a new bus company">
            <select className={inputClass} name="newContractorCounty" defaultValue="">
              <option value="">Choose a county</option>
              {NJ_COUNTIES.map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
          </Field>
        </>
      ) : null}
      <Field label="Type">
        <select className={inputClass} name="type" required defaultValue={values?.type ?? "original"}>
          {CONTRACT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Multi-contract number">
        <input className={inputClass} name="multiContractNumber" required defaultValue={values?.multiContractNumber ?? ""} />
      </Field>
      <Field label="Route number(s)" hint="One per line, or separated by commas.">
        <textarea className={inputClass} name="routes" rows={3} defaultValue={values?.routes ?? ""} />
      </Field>
      <Field label="Bid number">
        <input className={inputClass} name="bidNumber" defaultValue={values?.bidNumber ?? ""} />
      </Field>
      <Field label="Status">
        <select className={inputClass} name="statusName" defaultValue={values?.statusName ?? "Need Review"}>
          {statuses.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="1st reviewer">
        <select className={inputClass} name="firstReviewerId" defaultValue={values?.firstReviewerId ?? ""}>
          <option value="">Not recorded</option>
          {reviewers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="2nd reviewer">
        <select className={inputClass} name="secondReviewerId" defaultValue={values?.secondReviewerId ?? ""}>
          <option value="">Not recorded</option>
          {reviewers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date sent to district">
        <input className={inputClass} type="date" name="sentToDistrictAt" defaultValue={values?.sentToDistrictAt ?? ""} />
      </Field>
      <Field
        label="Insurance expiration date"
        hint="Filed on this contractor and district. You can add the certificate file later under Insurance."
      >
        <input className={inputClass} type="date" name="insuranceExpiresAt" defaultValue={values?.insuranceExpiresAt ?? ""} />
      </Field>
      <Field label="Notes" className="md:col-span-2">
        <textarea className={inputClass} name="notes" rows={2} defaultValue={values?.notes ?? ""} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit">{submitLabel}</Button>
        {extraActions}
      </div>
    </form>
  );
}
