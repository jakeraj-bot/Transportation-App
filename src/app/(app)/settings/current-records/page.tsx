import { redirect } from "next/navigation";
import { importContractors } from "@/app/actions";
import { ContractIntakeForm } from "@/components/contract-intake-form";
import { ContractTypePicker } from "@/components/contract-type-picker";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { isIntakeType } from "@/lib/contract-intake";
import { activeContractors, activeDistricts, getSchoolYear, getStatuses } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";

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
    type?: string;
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
        hint="Super Admin only. Use this while we copy contractors and contracts from the current office system. Choose the contract type first, the same way as New contract. Parentals and joint agreements ask for their own fields. Addendums have to be linked to a multi-contract number and route already on file."
      />

      {q.error ? (
        <Card className="bg-rose-soft">
          <p className="font-medium text-rose">{q.error}</p>
          <p className="mt-1 text-sm">You can also copy the tracker rows in Excel and paste them in the box below.</p>
        </Card>
      ) : null}
      {q.saved === "contract" || q.saved === "addendum" ? (
        <Card className="bg-teal-soft">
          <p className="font-medium">
            {q.saved === "addendum" ? `Linked addendum to ${q.number || "the contract"}.` : `Saved ${q.number || "the contract"}.`}
          </p>
          <p className="mt-1 text-sm text-muted">The form below is ready for the next one. It also appears in Contracts.</p>
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
        {isIntakeType(q.type) ? (
          <ContractIntakeForm
            source="current"
            type={q.type}
            schoolYear={schoolYear}
            districts={districts}
            contractors={contractors}
            statuses={statuses}
            reviewers={reviewers}
            changeTypeHref="/settings/current-records"
          />
        ) : (
          <ContractTypePicker
            basePath="/settings/current-records"
            hint="Choose the type first. Parentals ask for the parent name. Joints ask for host and joiner. Addendums find an existing multi-contract number and ask before they link."
          />
        )}
      </Card>
    </div>
  );
}
