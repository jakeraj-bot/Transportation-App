"use client";

import { useMemo, useState } from "react";
import { addQuickContractor, saveContract } from "@/app/actions";
import { Button, Field, inputClass } from "@/components/ui";
import { CONTRACT_TYPES, toInputDate } from "@/lib/utils";
import { checklistDefinition } from "@/lib/checklists";
import type { BidSpec, Contract, ExtraPacket, Route, RouteDescription, Status } from "@prisma/client";

type ContractorOption = { id: string; legalName: string; incomplete?: boolean };

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
  extraPackets,
  linkedRouteIds,
  currentUserId,
}: {
  mode: "intake" | "review";
  schoolYear: string;
  districts: Array<{ id: string; name: string }>;
  contractors: ContractorOption[];
  statuses: Status[];
  bidSpecs?: BidSpec[];
  routePackets?: RouteDescription[];
  contract?: Contract;
  routes?: Route[];
  extraPackets?: ExtraPacket[];
  linkedRouteIds?: string[];
  currentUserId?: string;
}) {
  const [type, setType] = useState(contract?.type ?? "original");
  const [contractorList, setContractorList] = useState(contractors);
  const [contractorId, setContractorId] = useState(contract?.contractorId ?? "");
  const [addingContractor, setAddingContractor] = useState(false);
  const [newContractorName, setNewContractorName] = useState("");
  const [contractorError, setContractorError] = useState("");
  const [extras, setExtras] = useState(
    extraPackets?.map((packet) => ({
      multiContractNumber: packet.multiContractNumber,
      routeNumber: packet.routeNumber,
    })) ?? []
  );
  const ownSecondReview =
    mode === "review" &&
    contract?.statusName === "2nd review" &&
    contract.firstReviewerId &&
    currentUserId &&
    contract.firstReviewerId === currentUserId;

  const packets = useMemo(() => routePackets ?? [], [routePackets]);
  const bidPackets = packets.filter((p) => p.kind !== "emergency_quote");
  const quotePackets = packets.filter((p) => p.kind === "emergency_quote");
  const checklist = checklistDefinition("contract", type);
  const reviewHint =
    type === "renewal"
      ? "Renewals need prior-year cost so we can check the CPI increase, plus the renewal checklist."
      : type === "addendum"
        ? "If the addendum increases the cost, the bond amount has to increase too."
        : type === "joint"
          ? "Joints need host, joiner, and date received. Those three decide which agreements share an approval letter."
          : type === "original"
            ? "Originals need the linked bid spec and approved route descriptions, plus the bid checklist."
            : type === "quote"
              ? "Quotes need the linked emergency quote packet, plus the quote checklist."
              : "Parental contracts only need the shared review fields plus the parental checklist.";

  async function createContractor() {
    setContractorError("");
    try {
      const row = await addQuickContractor(newContractorName);
      setContractorList((current) =>
        [...current, row].sort((a, b) => a.legalName.localeCompare(b.legalName))
      );
      setContractorId(row.id);
      setNewContractorName("");
      setAddingContractor(false);
    } catch (error) {
      setContractorError(error instanceof Error ? error.message : "Could not add that contractor.");
    }
  }

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
        <Field
          label="Contractor"
          hint="If this packet has a contractor we have not filed yet, add the name only. It stays red until someone fills in the contractor tab."
        >
          <select
            className={inputClass}
            name="contractorId"
            required={type !== "addendum"}
            value={contractorId}
            onChange={(e) => setContractorId(e.target.value)}
          >
            <option value="">Choose a contractor</option>
            {contractorList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.incomplete ? `${c.legalName} (needs details)` : c.legalName}
              </option>
            ))}
          </select>
          {addingContractor ? (
            <div className="mt-2 space-y-2">
              <input
                className={inputClass}
                value={newContractorName}
                onChange={(e) => setNewContractorName(e.target.value)}
                placeholder="Contractor name"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-teal px-3 py-2 text-sm font-medium text-white"
                  onClick={createContractor}
                >
                  Save name
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
                  onClick={() => setAddingContractor(false)}
                >
                  Cancel
                </button>
              </div>
              {contractorError ? <p className="text-sm text-rose">{contractorError}</p> : null}
            </div>
          ) : (
            <button
              type="button"
              className="mt-2 text-sm text-teal hover:underline"
              onClick={() => setAddingContractor(true)}
            >
              Add new contractor
            </button>
          )}
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
        <Field
          label="Multi-contract number"
          hint={
            type === "addendum"
              ? "Use the same multi-contract number as the contract this addendum belongs to. It will attach instead of making a new contract."
              : "This is the number the district put on the packet."
          }
        >
          <input className={inputClass} name="multiContractNumber" required defaultValue={contract?.multiContractNumber} />
        </Field>
        <Field
          label="Route numbers"
          className="md:col-span-2"
          hint={
            type === "addendum"
              ? "Enter the existing route number. The addendum will attach to that route and you will see how many addendums it already has."
              : "Enter each route on its own line. Addendums attach to these routes, not the multi-contract number."
          }
        >
          <textarea className={inputClass} name="routes" rows={4} defaultValue={routes?.map((r) => r.number).join("\n")} />
        </Field>
        {type === "renewal" ? (
          <div className="md:col-span-2 space-y-3 rounded-xl border border-line bg-cream px-4 py-3">
            <p className="font-medium">Additional multi-contract numbers</p>
            <p className="text-sm text-muted">
              A renewal can cover more than one multi-contract number. Each extra number needs the route number that goes with it.
            </p>
            {extras.map((packet, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <Field label="Multi-contract number">
                  <input
                    className={inputClass}
                    name="extraMultiContractNumber"
                    value={packet.multiContractNumber}
                    onChange={(e) =>
                      setExtras((current) =>
                        current.map((row, i) =>
                          i === index ? { ...row, multiContractNumber: e.target.value } : row
                        )
                      )
                    }
                  />
                </Field>
                <Field label="Route number">
                  <input
                    className={inputClass}
                    name="extraRouteNumber"
                    value={packet.routeNumber}
                    onChange={(e) =>
                      setExtras((current) =>
                        current.map((row, i) => (i === index ? { ...row, routeNumber: e.target.value } : row))
                      )
                    }
                  />
                </Field>
                <button
                  type="button"
                  className="self-end pb-1 text-sm text-rose"
                  onClick={() => setExtras((current) => current.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-teal hover:underline"
              onClick={() => setExtras((current) => [...current, { multiContractNumber: "", routeNumber: "" }])}
            >
              Add another multi-contract number
            </button>
          </div>
        ) : null}
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
            <p className="md:col-span-2 rounded-xl bg-cream px-4 py-3 text-sm text-muted">
              Every contract asks for status, start and end dates, board meeting date, contract total cost, bond amount, bond type, and insurance amount.
              {checklist ? ` The ${checklist.name.toLowerCase()} checklist is on this page after you save.` : ""} {reviewHint}
            </p>
            <Field label="Contract start date" hint="Ask this when review starts. Do not assume September 1 unless that is what the packet says.">
              <input className={inputClass} type="date" name="startsOn" defaultValue={toInputDate(contract?.startsOn)} />
            </Field>
            <Field label="Contract end date" hint="Used to see if insurance covers the whole run, or if a new certificate is needed before this date.">
              <input className={inputClass} type="date" name="endsOn" defaultValue={toInputDate(contract?.endsOn)} />
            </Field>
            <Field label="Board meeting date">
              <input className={inputClass} type="date" name="boardMeetingDate" defaultValue={toInputDate(contract?.boardMeetingDate)} />
            </Field>
            <Field label="Contract total cost">
              <input className={inputClass} name="cost" defaultValue={contract?.cost ?? ""} />
            </Field>
            <Field
              label="Bond amount"
              hint={type === "addendum" ? "If this addendum increased the cost, the performance bond has to increase too." : undefined}
            >
              <input className={inputClass} name="bondAmount" defaultValue={contract?.bondAmount ?? ""} />
            </Field>
            <Field label="Bond type">
              <select className={inputClass} name="bondType" defaultValue={contract?.bondType ?? "none"}>
                <option value="none">None</option>
                <option value="corporate">Corporate</option>
                <option value="personal">Personal</option>
              </select>
            </Field>
            <Field label="Insurance amount">
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
