"use client";

import { useMemo, useState } from "react";
import { saveContract } from "@/app/actions";
import { Button, Field, inputClass } from "@/components/ui";
import { CONTRACT_TYPES, toInputDate } from "@/lib/utils";
import type { BidSpec, Contract, Route, RouteDescription, Status } from "@prisma/client";

export function ContractForm({
  mode,
  schoolYear,
  districts,
  contractors,
  statuses,
  bidSpecs,
  routePackets,
  contract,
  routes,
  linkedRouteIds,
  currentUserId,
}: {
  mode: "intake" | "review";
  schoolYear: string;
  districts: Array<{ id: string; name: string }>;
  contractors: Array<{ id: string; legalName: string }>;
  statuses: Status[];
  bidSpecs?: BidSpec[];
  routePackets?: RouteDescription[];
  contract?: Contract;
  routes?: Route[];
  linkedRouteIds?: string[];
  currentUserId?: string;
}) {
  const [type, setType] = useState(contract?.type ?? "original");
  const ownSecondReview =
    mode === "review" &&
    contract?.statusName === "2nd review" &&
    contract.firstReviewerId &&
    currentUserId &&
    contract.firstReviewerId === currentUserId;

  const packets = useMemo(() => routePackets ?? [], [routePackets]);
  const bidPackets = packets.filter((p) => p.kind !== "emergency_quote");
  const quotePackets = packets.filter((p) => p.kind === "emergency_quote");

  return (
    <form action={saveContract} className="space-y-5">
      {contract ? <input type="hidden" name="id" value={contract.id} /> : null}
      <input type="hidden" name="mode" value={mode} />
      {ownSecondReview ? (
        <p className="rounded-xl bg-amber-soft px-4 py-3 text-sm">
          You did the first review on this contract. A second review should be done by someone else when they are in the office. Super Admin can still save if a backup is needed.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="District">
          <select className={inputClass} name="districtId" required defaultValue={contract?.districtId}>
            <option value="">Choose a district</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Contractor">
          <select className={inputClass} name="contractorId" required defaultValue={contract?.contractorId}>
            <option value="">Choose a contractor</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>{c.legalName}</option>
            ))}
          </select>
        </Field>
        <Field label="School year">
          <input className={inputClass} name="schoolYear" required defaultValue={contract?.schoolYear ?? schoolYear} />
        </Field>
        <Field label="Date received">
          <input className={inputClass} type="date" name="receivedDate" defaultValue={toInputDate(contract?.receivedDate)} />
        </Field>
        <Field label="Type of contract">
          <select
            className={inputClass}
            name="type"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {CONTRACT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Multi-contract number" hint="This is the number the district put on the packet.">
          <input className={inputClass} name="multiContractNumber" required defaultValue={contract?.multiContractNumber} />
        </Field>
        <Field label="Route numbers" className="md:col-span-2" hint="Enter each route on its own line. Addendums attach to these routes, not the multi-contract number.">
          <textarea className={inputClass} name="routes" rows={4} defaultValue={routes?.map((r) => r.number).join("\n")} />
        </Field>
        <Field label="Status">
          <select className={inputClass} name="statusName" defaultValue={contract?.statusName ?? "Need Review"}>
            {statuses.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Notes or comments" className={mode === "intake" ? "md:col-span-2" : undefined}>
          <textarea className={inputClass} name="notes" rows={3} defaultValue={contract?.notes ?? ""} />
        </Field>

        {mode === "review" ? (
          <>
            <Field label="Contract start date" hint="Defaults to September 1 of the school year.">
              <input className={inputClass} type="date" name="startsOn" defaultValue={toInputDate(contract?.startsOn)} />
            </Field>
            <Field label="Contract end date" hint="Defaults to June 30 of the school year.">
              <input className={inputClass} type="date" name="endsOn" defaultValue={toInputDate(contract?.endsOn)} />
            </Field>
            <Field label="Board meeting date">
              <input className={inputClass} type="date" name="boardMeetingDate" defaultValue={toInputDate(contract?.boardMeetingDate)} />
            </Field>
            <Field label="Contract cost">
              <input className={inputClass} name="cost" defaultValue={contract?.cost ?? ""} />
            </Field>
            <Field label="Bond amount">
              <input className={inputClass} name="bondAmount" defaultValue={contract?.bondAmount ?? ""} />
            </Field>
            <Field label="Bond type">
              <select className={inputClass} name="bondType" defaultValue={contract?.bondType ?? "none"}>
                <option value="none">None</option>
                <option value="corporate">Corporate</option>
                <option value="personal">Personal</option>
              </select>
            </Field>
            <Field label="Insurance amount on this contract">
              <input className={inputClass} name="insuranceAmount" defaultValue={contract?.insuranceAmount ?? ""} />
            </Field>
            {["Approved", "Disapproved", "Final Approval", "Final Disapproval"].includes(contract?.statusName ?? "") ? (
              <Field label="Date sent to district" hint="The day the signed letter left the office.">
                <input className={inputClass} type="date" name="sentToDistrictAt" defaultValue={toInputDate(contract?.sentToDistrictAt)} />
              </Field>
            ) : null}

            {type === "renewal" ? (
              <Field label="Prior-year cost" hint="Used only on renewals to check the CPI increase." className="md:col-span-2">
                <input className={inputClass} name="priorYearCost" defaultValue={contract?.priorYearCost ?? ""} />
              </Field>
            ) : null}

            {type === "joint" ? (
              <>
                <Field label="Host district">
                  <select className={inputClass} name="hostDistrictId" defaultValue={contract?.hostDistrictId ?? ""}>
                    <option value="">Choose the host</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Joiner district(s)">
                  <input className={inputClass} name="joinerDistricts" defaultValue={contract?.joinerDistricts ?? ""} placeholder="Names of joiner districts" />
                </Field>
              </>
            ) : null}

            {type === "original" ? (
              <>
                <Field label="Linked approved route descriptions" hint="Bid route descriptions that were approved before this original contract.">
                  <select className={inputClass + " h-32"} name="routeDescriptionIds" multiple defaultValue={linkedRouteIds ?? []}>
                    {bidPackets.map((r) => (
                      <option key={r.id} value={r.id}>{r.destination || r.title} ({r.routeNumbers})</option>
                    ))}
                  </select>
                </Field>
                <Field label="Linked bid spec">
                  <select className={inputClass} name="bidSpecId" defaultValue={contract?.bidSpecId ?? ""}>
                    <option value="">None</option>
                    {(bidSpecs ?? []).map((b) => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}

            {type === "quote" ? (
              <Field label="Linked emergency quote packet" className="md:col-span-2">
                <select className={inputClass} name="routePacketId" defaultValue={contract?.routePacketId ?? ""}>
                  <option value="">None</option>
                  {quotePackets.map((q) => (
                    <option key={q.id} value={q.id}>{q.destination || q.title} ({q.routeNumbers})</option>
                  ))}
                </select>
              </Field>
            ) : null}
          </>
        ) : null}
      </div>
      <Button type="submit">
        {mode === "intake" && !contract ? "Save incoming contract" : "Save"}
      </Button>
    </form>
  );
}
