import { redirect } from "next/navigation";
import { importContractors, saveCurrentContract } from "@/app/actions";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { activeContractors, activeDistricts, getSchoolYear, getStatuses } from "@/lib/data";
import { NJ_COUNTIES } from "@/lib/nj-counties";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { CONTRACT_TYPES } from "@/lib/utils";

export default async function CurrentRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    number?: string;
    imported?: string;
    updated?: string;
    certs?: string;
    error?: string;
  }>;
}) {
  const session = await getSession();
  if (!isSuperAdmin(session?.role)) redirect("/");
  const q = await searchParams;
  const [schoolYear, districts, contractors, statuses, reviewers] = await Promise.all([
    getSchoolYear(),
    activeDistricts(),
    activeContractors(),
    getStatuses("contract"),
    prisma.user.findMany({
      where: { deletedAt: null, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bring in current records"
        backHref="/settings"
        hint="Super Admin only. Use this while we copy contractors and contracts from the current office system. Incoming packets should still use New contract. Tell us when the move is done and we can take this page out."
      />

      {q.error ? (
        <Card className="bg-rose-soft">
          <p className="font-medium text-rose">{q.error}</p>
          <p className="mt-1 text-sm">You can also copy the tracker rows in Excel and paste them in the box below.</p>
        </Card>
      ) : null}
      {q.saved === "contract" ? (
        <Card className="bg-teal-soft">
          <p className="font-medium">Saved {q.number || "the contract"}.</p>
          <p className="mt-1 text-sm text-muted">The form below is blank so you can enter the next one. It also appears in Contracts.</p>
        </Card>
      ) : null}
      {q.imported || q.updated || q.certs ? (
        <Card className="bg-teal-soft">
          <p className="font-medium">
            Tracker uploaded: {q.imported || "0"} contractor{(q.imported || "0") === "1" ? "" : "s"} added
            {q.updated ? `, ${q.updated} updated` : ""}
            {q.certs ? `, ${q.certs} annual cert${q.certs === "1" ? "" : "s"}` : ""}.
          </p>
        </Card>
      ) : null}

      <Card>
        <h2 className="serif mb-2 text-2xl">Upload the certification tracker</h2>
        <p className="mb-4 text-muted">
          Excel (.xlsx) or CSV. This adds every bus company and their annual certification for {schoolYear}. Matching uses the Office of Student Protection code when it is on the row, otherwise the bus company name.
        </p>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-muted">
          <li><strong>Contractor code</strong> — Office of Student Protection code</li>
          <li><strong>Bus Company</strong> — contractor name</li>
          <li><strong>County</strong> — home county for the contractor, and the county this annual cert is for. If the same company appears again with a different county, that is another terminal and another cert</li>
          <li><strong>Date Received</strong> — date we received their annual certification</li>
          <li><strong>Date reviewed</strong> — date we reviewed it</li>
          <li><strong>Compliance Status</strong> — approved, pending, need review, and so on</li>
          <li><strong>Status</strong> — notes: if approved, the date the compliance letter went out; if pending, why it is pending</li>
        </ul>
        <form action={importContractors} encType="multipart/form-data" className="space-y-4">
          <input type="hidden" name="redirectTo" value="/settings/current-records" />
          <Field label="Tracker file" hint="Excel (.xlsx) or CSV. Macros (.xlsm) are fine too.">
            <input className={inputClass} type="file" name="file" accept=".csv,.xlsx,.xls,.xlsm,.xlsb,text/csv" />
          </Field>
          <Field label="Or paste from Excel" hint="Copy the header row and the contractor rows, then paste here.">
            <textarea className={inputClass} name="pasted" rows={6} placeholder="Contractor code	Bus Company	County	Date Received	Date reviewed	Compliance Status	Status" />
          </Field>
          <Button type="submit">Upload tracker</Button>
        </form>
        <p className="mt-3 text-sm">
          <a className="text-teal hover:underline" href="/certification-tracker-template.csv">Download a blank CSV with these column names</a>
        </p>
      </Card>

      <Card>
        <h2 className="serif mb-2 text-2xl">Enter a current contract</h2>
        <p className="mb-4 text-muted">
          For packets already in the current system. This does not change New contract. Upload the tracker first so the bus company list is filled in.
        </p>
        <form action={saveCurrentContract} className="grid gap-4 md:grid-cols-2">
          <Field label="Date received">
            <input className={inputClass} type="date" name="receivedDate" />
          </Field>
          <Field label="School year">
            <input className={inputClass} name="schoolYear" required defaultValue={schoolYear} />
          </Field>
          <Field label="District">
            <select className={inputClass} name="districtId" required defaultValue="">
              <option value="">Choose a district</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Bus company" hint="Choose one from the tracker, or type a new name below.">
            <select className={inputClass} name="contractorId" defaultValue="">
              <option value="">Choose a bus company</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>{c.legalName}</option>
              ))}
            </select>
          </Field>
          <Field label="Or type a new bus company">
            <input className={inputClass} name="newContractorName" placeholder="Only if it is not in the list yet" />
          </Field>
          <Field label="County for a new bus company">
            <select className={inputClass} name="newContractorCounty" defaultValue="">
              <option value="">Choose a county</option>
              {NJ_COUNTIES.map((county) => (
                <option key={county} value={county}>{county}</option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select className={inputClass} name="type" required defaultValue="original">
              {CONTRACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Multi-contract number">
            <input className={inputClass} name="multiContractNumber" required />
          </Field>
          <Field label="Route number(s)" hint="One per line, or separated by commas.">
            <textarea className={inputClass} name="routes" rows={3} />
          </Field>
          <Field label="Bid number">
            <input className={inputClass} name="bidNumber" />
          </Field>
          <Field label="Status">
            <select className={inputClass} name="statusName" defaultValue="Need Review">
              {statuses.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="1st reviewer">
            <select className={inputClass} name="firstReviewerId" defaultValue="">
              <option value="">Not recorded</option>
              {reviewers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </Field>
          <Field label="2nd reviewer">
            <select className={inputClass} name="secondReviewerId" defaultValue="">
              <option value="">Not recorded</option>
              {reviewers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Date sent to district">
            <input className={inputClass} type="date" name="sentToDistrictAt" />
          </Field>
          <Field label="Insurance expiration date" hint="Filed on this contractor and district. You can add the certificate file later under Insurance.">
            <input className={inputClass} type="date" name="insuranceExpiresAt" />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <textarea className={inputClass} name="notes" rows={2} />
          </Field>
          <div>
            <Button type="submit">Save current contract</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
