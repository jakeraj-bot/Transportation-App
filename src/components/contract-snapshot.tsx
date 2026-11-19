import Link from "next/link";
import { parentalInsuranceMeetsRequirement, parentalInsuranceTotal } from "@/lib/parental-insurance";
import { contractTypeLabel, formatCurrency, formatDate } from "@/lib/utils";

function ParentalTotal({
  insuranceAmount,
  umbrellaAmount,
}: {
  insuranceAmount: number | null;
  umbrellaAmount?: number | null;
}) {
  const total = parentalInsuranceTotal(insuranceAmount, umbrellaAmount);
  if (total == null) return <span className="text-rose">Needs $1,500,000</span>;
  const shown = `$${formatCurrency(total)}`;
  if (parentalInsuranceMeetsRequirement(insuranceAmount, umbrellaAmount)) return shown;
  return <span className="text-rose">{shown} · needs $1,500,000</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/80 py-1">
      <p className="shrink-0 text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <div className="min-w-0 text-right text-sm font-medium break-words">{children || "—"}</div>
    </div>
  );
}

export function ContractSnapshot({
  contractId,
  contract,
  companyNames,
  routes,
}: {
  contractId: string;
  contract: {
    multiContractNumber: string;
    schoolYear: string;
    type: string;
    district: { id: string; name: string };
    contractorId: string;
    parentName: string | null;
    hostDistrict: { name: string } | null;
    joinerDistricts: string | null;
    receivedDate: Date | null;
    boardMeetingDate: Date | null;
    startsOn: Date | null;
    endsOn: Date | null;
    cost: number | null;
    bondAmount: number | null;
    bondType: string;
    insuranceAmount: number | null;
    umbrellaInsuranceAmount?: number | null;
  };
  companyNames: string;
  routes: Array<{
    id: string;
    number: string;
    cancelledAt: Date | null;
    addenda: Array<{ id: string; reason: string }>;
  }>;
}) {
  const districtLabel =
    contract.type === "joint" && contract.hostDistrict
      ? `${contract.hostDistrict.name}${contract.joinerDistricts ? ` · ${contract.joinerDistricts}` : ""}`
      : contract.district.name;

  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-line pb-1.5">
        <span className="serif text-lg">
          {contract.type === "joint"
            ? `Routes ${routes.map((route) => route.number).filter(Boolean).join(", ") || "—"}`
            : contract.multiContractNumber}
        </span>
        <span className="text-sm text-muted">{contractTypeLabel(contract.type)}</span>
        <span className="text-sm text-muted">{contract.schoolYear}</span>
      </div>

      <div className="mt-1">
        <Field label="District">
          <Link className="text-teal hover:underline" href={`/districts/${contract.district.id}`}>
            {districtLabel}
          </Link>
        </Field>
        <Field label="Date received">{formatDate(contract.receivedDate)}</Field>
        <Field label={contract.type === "parental" ? "Parent" : "Bus company"}>
          {contract.parentName ? (
            contract.parentName
          ) : (
            <Link className="text-teal hover:underline" href={`/contractors/${contract.contractorId}`}>
              {companyNames}
            </Link>
          )}
        </Field>
        <Field label="Board meeting">{formatDate(contract.boardMeetingDate)}</Field>
        <Field label="Contract dates">
          {contract.startsOn || contract.endsOn
            ? `${formatDate(contract.startsOn)} – ${formatDate(contract.endsOn)}`
            : null}
        </Field>
        <Field label="Cost">
          {contract.cost != null ? `$${formatCurrency(contract.cost)}` : null}
        </Field>
        {contract.type === "parental" ? (
          <>
            <Field label="Insurance">
              {contract.insuranceAmount != null ? `$${formatCurrency(contract.insuranceAmount)}` : null}
            </Field>
            <Field label="Umbrella">
              {contract.umbrellaInsuranceAmount != null ? `$${formatCurrency(contract.umbrellaInsuranceAmount)}` : null}
            </Field>
            <Field label="Together">
              <ParentalTotal insuranceAmount={contract.insuranceAmount} umbrellaAmount={contract.umbrellaInsuranceAmount} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Bond">
              {contract.bondAmount != null || contract.bondType !== "none"
                ? `${contract.bondType !== "none" ? contract.bondType : "None"}${contract.bondAmount != null ? ` · $${formatCurrency(contract.bondAmount)}` : ""}`
                : null}
            </Field>
            <Field label="Insurance">
              {contract.insuranceAmount != null ? `$${formatCurrency(contract.insuranceAmount)}` : null}
            </Field>
          </>
        )}
        <Field label="Routes">
          {routes.length === 0
            ? "No routes yet"
            : routes.map((route, index) => (
                <span key={route.id}>
                  {index > 0 ? ", " : ""}
                  <Link
                    className={`hover:underline ${route.cancelledAt ? "text-muted line-through" : "text-teal"}`}
                    href={`/contracts/${contractId}/routes/${route.id}`}
                  >
                    {route.number}
                  </Link>
                  {route.addenda.length ? ` (${route.addenda.length} addendum${route.addenda.length === 1 ? "" : "s"})` : ""}
                </span>
              ))}
        </Field>
      </div>
    </div>
  );
}
