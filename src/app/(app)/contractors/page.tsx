import Link from "next/link";
import { importContractors } from "@/app/actions";
import { Button, Card, EmptyState, Field, PageHeader, StatusChip, inputClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function ContractorsPage() {
  const rows = await prisma.contractor.findMany({
    where: { deletedAt: null },
    include: { annualCerts: true },
    orderBy: { legalName: "asc" },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractors"
        hint="Vendor codes, OSP codes, bus locations, contacts, and Business Registration Certificates."
        actions={<Button href="/contractors/new">Add one contractor</Button>}
      />
      <Card>
        <h2 className="serif mb-2 text-2xl">Upload a list</h2>
        <p className="mb-4 text-muted">
          CSV columns: legalName, dba, vendorCode, ospCode, busLocation, contactName, phone, email, brcNumber. You can still add one contractor at a time.
        </p>
        <form action={importContractors} className="flex flex-wrap items-end gap-3">
          <Field label="CSV file">
            <input className={inputClass} type="file" name="file" accept=".csv,text/csv" required />
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
                <th className="px-5 py-3 font-medium">Vendor / OSP</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">BRC</th>
                <th className="px-5 py-3 font-medium">Debarred</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={`border-b border-line/70 ${c.incomplete ? "incomplete-row" : ""}`}>
                  <td className="px-5 py-3">
                    <Link className={c.incomplete ? "font-medium text-rose hover:underline" : "text-teal hover:underline"} href={`/contractors/${c.id}`}>{c.legalName}</Link>
                    {c.incomplete ? <div className="text-xs text-rose">Needs details</div> : null}
                    {c.busLocation ? <div className="text-xs text-muted">{c.busLocation}</div> : null}
                  </td>
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
