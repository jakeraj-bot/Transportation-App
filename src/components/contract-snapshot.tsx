import Link from "next/link";
import { saveContractDates } from "@/app/actions";
import { Button, inputClass } from "@/components/ui";
import { contractTypeLabel, formatCurrency, formatDate, toInputDate } from "@/lib/utils";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-0.5 text-sm font-medium break-words">{children || "—"}</div>
    </div>
  );
}

export function ContractSnapshot({
  contractId,
  contract,
  companyNames,
  routes,
  canEdit = false,
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
  };
  companyNames: string;
  routes: Array<{
    id: string;
    number: string;
    cancelledAt: Date | null;
    addenda: Array<{ id: string; reason: string }>;
  }>;
  canEdit?: boolean;
}) {
  const districtLabel =
    contract.type === "joint" && contract.hostDistrict
      ? `${contract.hostDistrict.name}${contract.joinerDistricts ? ` · ${contract.joinerDistricts}` : ""}`
      : contract.district.name;

  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-3">
        <span className="serif text-xl">{contract.multiContractNumber}</span>
        <span className="text-sm text-muted">{contractTypeLabel(contract.type)}</span>
        <span className="text-sm text-muted">{contract.schoolYear}</span>
      </div>

      <div className="mt-3 grid gap-x-5 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Field label="District">
          <Link className="text-teal hover:underline" href={`/districts/${contract.district.id}`}>
            {districtLabel}
          </Link>
        </Field>
        <Field label="Date received">{formatDate(contract.receivedDate)}</Field>
        <Field label="Contractor">
          {contract.parentName ? (
            contract.parentName
          ) : (
            <Link className="text-teal hover:underline" href={`/contractors/${contract.contractorId}`}>
              {companyNames}
            </Link>
          )}
        </Field>
        <Field label="Board meeting">{formatDate(contract.boardMeetingDate)}</Field>
        <div className="min-w-0 sm:col-span-2">
          <p className="text-[11px] uppercase tracking-wide text-muted">Contract dates</p>
          {canEdit ? (
            <form action={saveContractDates} className="mt-1 flex flex-wrap items-end gap-2">
              <input type="hidden" name="contractId" value={contractId} />
              <input
                className={inputClass + " w-auto min-w-[9.5rem]"}
                type="date"
                name="startsOn"
                defaultValue={toInputDate(contract.startsOn)}
                aria-label="Contract start date"
              />
              <span className="pb-2 text-sm text-muted">–</span>
              <input
                className={inputClass + " w-auto min-w-[9.5rem]"}
                type="date"
                name="endsOn"
                defaultValue={toInputDate(contract.endsOn)}
                aria-label="Contract end date"
              />
              <Button type="submit" variant="secondary" className="py-2 text-sm">
                Save dates
              </Button>
            </form>
          ) : (
            <p className="mt-0.5 text-sm font-medium">
              {contract.startsOn || contract.endsOn
                ? `${formatDate(contract.startsOn)} – ${formatDate(contract.endsOn)}`
                : "—"}
            </p>
          )}
        </div>
        <Field label="Cost">
          {contract.cost != null ? `$${formatCurrency(contract.cost)}` : null}
        </Field>
        <Field label="Bond">
          {contract.bondAmount != null || contract.bondType !== "none"
            ? `${contract.bondType !== "none" ? contract.bondType : "None"}${contract.bondAmount != null ? ` · $${formatCurrency(contract.bondAmount)}` : ""}`
            : null}
        </Field>
        <Field label="Insurance">
          {contract.insuranceAmount != null ? `$${formatCurrency(contract.insuranceAmount)}` : null}
        </Field>
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <p className="text-[11px] uppercase tracking-wide text-muted">Routes</p>
        {routes.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No routes yet</p>
        ) : (
          <ul className="mt-1.5 grid w-full grid-cols-2 gap-x-8 gap-y-2">
            {routes.map((route) => (
              <li key={route.id} className="min-w-0 w-full text-sm leading-snug">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <Link
                    className={`font-medium hover:underline ${route.cancelledAt ? "text-muted line-through" : "text-teal"}`}
                    href={`/contracts/${contractId}/routes/${route.id}`}
                  >
                    {route.number}
                  </Link>
                  {route.cancelledAt ? <span className="text-xs text-rose">cancelled</span> : null}
                </div>
                {route.addenda.length > 0 ? (
                  <p className="mt-0.5 text-xs text-muted break-words">
                    {route.addenda.map((addendum, index) => (
                      <span key={addendum.id}>
                        {index > 0 ? ", " : ""}
                        <Link
                          className="text-teal hover:underline"
                          href={`/contracts/${contractId}/routes/${route.id}`}
                        >
                          {addendum.reason}
                        </Link>
                      </span>
                    ))}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted">No addendum</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
