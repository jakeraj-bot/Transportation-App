import Link from "next/link";
import { importContractors } from "@/app/actions";
import { Button, Card, EmptyState, Field, PageHeader, StatusChip, inputClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; updated?: string; certs?: string; error?: string }>;
}) {
  const q = await searchParams;
  const rows = await prisma.contractor.findMany({
    where: { deletedAt: null },
    include: { annualCerts: true },
    orderBy: { legalName: "asc" },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractors"
        hint="Vendor codes, OSP codes, county, bus locations, contacts, and Business Registration Certificates."
        actions={<Button href="/contractors/new">Add one contractor</Button>}
      />
      {q.error ? (
        <Card className="bg-rose-soft">
          <p className="font-medium text-rose">{q.error}</p>
        </Card>
      ) : null}
      {q.imported || q.updated || q.certs ? (
        <Card className="bg-teal-soft">
          <p className="font-medium">
            Imported {q.imported || "0"} contractor{(q.imported || "0") === "1" ? "" : "s"}
            {q.updated ? `, updated ${q.updated}` : ""}
            {q.certs ? `, and ${q.certs} annual cert${q.certs === "1" ? "" : "s"}` : ""}.
          </p>
        </Card>
      ) : null}
      <Card>
        <h2 className="serif mb-2 text-2xl">Upload a list or certification tracker</h2>
        <p className="mb-4 text-muted">
          Excel or CSV. A certification tracker can use: Contractor code (OSP), Bus Company, County, Date Received, Date reviewed, Compliance Status, and Status (notes). A plain contractor list can still use legalName, dba, vendorCode, ospCode, busLocation, contactName, phone, email, brcNumber.
        </p>
        <form action={importContractors} encType="multipart/form-data" className="space-y-4">
          <Field label="Spreadsheet or CSV">
            <input
              className={inputClass}
              type="file"
              name="file"
              accept=".csv,.xlsx,.xls,.xlsm,.xlsb,text/csv"
            />
          </Field>
          <Field label="Or paste from Excel">
            <textarea className={inputClass} name="pasted" rows={5} />
          </Field>
          <Button type="submit">Import contractors</Button>
        </form>
      </Card>
      {rows.length === 0 ? (
        <EmptyState title="No contractors yet" body="Add a contractor when you get their first packet, or upload a list." action={<Button href="/contractors/new">Add contractor</Button>} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">County</th>
                <th className="px-5 py-3 font-medium">Vendor / OSP</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">BRC</th>
                <th className="px-5 py-3 font-medium">Debarred</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-line/70">
                  <td className="px-5 py-3">
                    <Link className="text-teal hover:underline" href={`/contractors/${c.id}`}>{c.legalName}</Link>
                    {c.busLocation ? <div className="text-xs text-muted">{c.busLocation}</div> : null}
                  </td>
                  <td className="px-5 py-3">{c.county || "—"}</td>
                  <td className="px-5 py-3">{c.vendorCode || "—"}{c.ospCode ? ` / ${c.ospCode}` : ""}</td>
                  <td className="px-5 py-3">{c.contactName || "—"}{c.phone ? ` · ${c.phone}` : ""}</td>
                  <td className="px-5 py-3"><StatusChip name={c.brcStatus} /></td>
                  <td className="px-5 py-3">{c.debarred ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
