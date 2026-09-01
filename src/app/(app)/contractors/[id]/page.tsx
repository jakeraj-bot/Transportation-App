import Link from "next/link";
import { notFound } from "next/navigation";
import { softDelete } from "@/app/actions";
import { ContractorForm } from "@/components/contractor-form";
import { Card, PageHeader, StatusChip } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { insuranceCoverage } from "@/lib/flags";

export default async function ContractorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contractor = await prisma.contractor.findFirst({
    where: { id, deletedAt: null },
    include: {
      annualCerts: { where: { deletedAt: null } },
      insurance: { where: { deletedAt: null }, include: { district: true } },
      contracts: { where: { deletedAt: null }, include: { district: true } },
    },
  });
  if (!contractor) notFound();
  async function remove() {
    "use server";
    await softDelete("contractor", id, "/contractors");
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title={contractor.legalName}
        backHref="/contractors"
        hint={`Vendor ${contractor.vendorCode || "not on file"} · OSP ${contractor.ospCode || "not on file"}`}
        actions={<form action={remove}><button className="rounded-xl bg-rose-soft px-4 py-2.5 text-rose" type="submit">Remove</button></form>}
      />
      <Card>
        <ContractorForm
          id={contractor.id}
          values={{
            legalName: contractor.legalName,
            dba: contractor.dba,
            vendorCode: contractor.vendorCode,
            ospCode: contractor.ospCode,
            busLocation: contractor.busLocation,
            contactName: contractor.contactName,
            email: contractor.email,
            phone: contractor.phone,
            brcNumber: contractor.brcNumber,
            brcNameControl: contractor.brcNameControl,
            brcStatus: contractor.brcStatus,
            debarred: contractor.debarred,
            notes: contractor.notes,
          }}
        />
      </Card>
      <Card>
        <h2 className="serif mb-3 text-2xl">Insurance by district</h2>
        <p className="mb-3 text-muted">One certificate can cover every contract this contractor has with that district, as long as the dates cover the full run.</p>
        <div className="space-y-2">
          {contractor.insurance.length === 0 ? <p className="text-muted">None on file yet.</p> : contractor.insurance.map((ins) => {
            const matching = contractor.contracts.filter((c) => c.districtId === ins.districtId);
            const worst = matching.reduce<{ kind: string; label: string }>(
              (acc, c) => {
                const result = insuranceCoverage({
                  insStart: ins.startsOn,
                  insEnd: ins.expiresAt,
                  contractStart: c.startsOn,
                  contractEnd: c.endsOn,
                  namedDistrict: ins.namedDistrict,
                  districtName: ins.district.name,
                });
                return result.kind === "covers" ? acc : result;
              },
              { kind: "covers", label: "Covers the contracts on file" }
            );
            return (
              <div key={ins.id} className="flex justify-between gap-3 rounded-xl border border-line px-4 py-3">
                <div>
                  <Link className="text-teal" href={`/insurance/${ins.id}`}>{ins.district.name}</Link>
                  <p className="text-sm text-muted">
                    {formatDate(ins.startsOn)} – {formatDate(ins.expiresAt)} · {matching.length} contract{matching.length === 1 ? "" : "s"}
                  </p>
                </div>
                <StatusChip name={worst.label} color={worst.kind === "covers" ? "sage" : "rose"} />
              </div>
            );
          })}
        </div>
        <Link className="mt-3 inline-block text-teal" href={`/insurance/new?contractorId=${contractor.id}`}>Add a district certificate</Link>
      </Card>
      <Card>
        <h2 className="serif mb-3 text-2xl">Annual certifications</h2>
        {contractor.annualCerts.map((c) => (
          <p key={c.id}><Link className="text-teal" href={`/certs/${c.id}`}>{c.schoolYear}</Link> — {c.statusName}</p>
        ))}
        <Link className="mt-2 inline-block text-teal" href={`/certs/new?contractorId=${contractor.id}`}>Add annual cert</Link>
      </Card>
    </div>
  );
}
