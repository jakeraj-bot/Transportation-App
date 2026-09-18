"use client";

import { useMemo, useState } from "react";
import { addQuickContractor, findContractForAddendum, saveContract, saveCurrentContract } from "@/app/actions";
import { DistrictPickerField, JoinerDistrictFields } from "@/components/district-picker-fields";
import { ReviewerFields } from "@/components/reviewer-fields";
import { Button, Field, inputClass } from "@/components/ui";
import { districtOptionLabel } from "@/lib/districts";
import {
  allowsMultipleCompanies,
  allowsMultiplePackets,
  intakeTypeLabel,
  showsBidNumber,
  showsRenewalNumber,
  usesBusCompany,
  usesHostJoiner,
  usesParentName,
  type IntakeType,
} from "@/lib/contract-intake";
import { NJ_COUNTIES } from "@/lib/nj-counties";
import type { Status } from "@prisma/client";

type ContractorOption = { id: string; legalName: string; incomplete?: boolean };
type DistrictOption = { id: string; name: string; county?: string | null };
type ReviewerOption = { id: string; name: string };
type ReviewerNameOption = { name: string };
type CompanyRow = { contractorId: string; newName: string; newCounty: string };
type PacketRowState = { multiContractNumber: string; routeNumber: string; renewalNumber: string };
type AddendumMatch = {
  id: string;
  type: string;
  typeLabel: string;
  schoolYear: string;
  multiContractNumber: string;
  districtName: string;
  contractorNames: string;
  statusName: string;
  routes: Array<{ id: string; number: string }>;
};

function emptyCompany(): CompanyRow {
  return { contractorId: "", newName: "", newCounty: "" };
}

export function ContractIntakeForm({
  source,
  type,
  schoolYear,
  districts,
  contractors,
  statuses,
  reviewers = [],
  reviewerNames = [],
  changeTypeHref,
}: {
  source: "incoming" | "current";
  type: IntakeType;
  schoolYear: string;
  districts: DistrictOption[];
  contractors: ContractorOption[];
  statuses: Status[];
  reviewers?: ReviewerOption[];
  reviewerNames?: ReviewerNameOption[];
  changeTypeHref: string;
}) {
  const current = source === "current";
  const [contractorList, setContractorList] = useState(contractors);
  const [companies, setCompanies] = useState<CompanyRow[]>([emptyCompany()]);
  const [companyError, setCompanyError] = useState("");
  const [packets, setPackets] = useState<PacketRowState[]>([
    { multiContractNumber: "", routeNumber: "", renewalNumber: "" },
  ]);
  const [findYear, setFindYear] = useState(schoolYear);
  const [findMulti, setFindMulti] = useState("");
  const [findDistrictId, setFindDistrictId] = useState("");
  const [findError, setFindError] = useState("");
  const [matches, setMatches] = useState<AddendumMatch[] | null>(null);
  const [pickedId, setPickedId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const picked = matches?.find((row) => row.id === pickedId) ?? null;
  const action = current ? saveCurrentContract : saveContract;

  const companyHint = allowsMultipleCompanies(type)
    ? "Choose a bus company from the list, or add a new name. Some packets have more than one company on the same contract."
    : "Choose a bus company from the list, or add a new name.";

  const listWithNew = useMemo(() => contractorList, [contractorList]);

  async function saveNewCompany(index: number) {
    const row = companies[index];
    setCompanyError("");
    try {
      const created = await addQuickContractor(row.newName, row.newCounty || undefined);
      setContractorList((currentList) =>
        [...currentList, created].sort((a, b) => a.legalName.localeCompare(b.legalName))
      );
      setCompanies((currentRows) =>
        currentRows.map((item, i) =>
          i === index ? { contractorId: created.id, newName: "", newCounty: "" } : item
        )
      );
    } catch (error) {
      setCompanyError(error instanceof Error ? error.message : "Could not add that bus company.");
    }
  }

  async function onFind(e: React.FormEvent) {
    e.preventDefault();
    setFindError("");
    setConfirmed(false);
    setRouteIds([]);
    try {
      const found = await findContractForAddendum({
        schoolYear: findYear,
        multiContractNumber: findMulti,
        districtId: findDistrictId,
      });
      setMatches(found);
      setPickedId(found[0]?.id ?? "");
      if (!found.length) {
        setFindError(
          "No contract on file has that multi-contract number and school year. Enter the original, renewal, quote, parental, or joint first, then come back to link the addendum."
        );
      }
    } catch (error) {
      setFindError(error instanceof Error ? error.message : "Could not look that contract up.");
      setMatches(null);
    }
  }

  function companyFields() {
    return (
      <div className={allowsMultipleCompanies(type) ? "md:col-span-2 space-y-3" : undefined}>
        {companies.map((row, index) => (
          <div key={index} className="rounded-xl border border-line bg-cream px-4 py-3 space-y-3">
            <Field label={index === 0 ? "Bus company" : `Bus company ${index + 1}`} hint={index === 0 ? companyHint : undefined}>
              <select
                className={inputClass}
                name="contractorId"
                required={type !== "addendum" && !row.newName}
                value={row.contractorId}
                onChange={(e) =>
                  setCompanies((currentRows) =>
                    currentRows.map((item, i) => (i === index ? { ...item, contractorId: e.target.value } : item))
                  )
                }
              >
                <option value="">Choose a bus company</option>
                {listWithNew.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.incomplete ? `${c.legalName} (needs details)` : c.legalName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Or type a new bus company">
              <input
                className={inputClass}
                name="newContractorName"
                value={row.newName}
                onChange={(e) =>
                  setCompanies((currentRows) =>
                    currentRows.map((item, i) => (i === index ? { ...item, newName: e.target.value } : item))
                  )
                }
                placeholder="Only if it is not in the list yet"
              />
            </Field>
            {current ? (
              <Field label="County for a new bus company">
                <select
                  className={inputClass}
                  name="newContractorCounty"
                  value={row.newCounty}
                  onChange={(e) =>
                    setCompanies((currentRows) =>
                      currentRows.map((item, i) => (i === index ? { ...item, newCounty: e.target.value } : item))
                    )
                  }
                >
                  <option value="">Choose a county</option>
                  {NJ_COUNTIES.map((county) => (
                    <option key={county} value={county}>{county}</option>
                  ))}
                </select>
              </Field>
            ) : null}
            {row.newName ? (
              <button type="button" className="text-sm text-teal hover:underline" onClick={() => saveNewCompany(index)}>
                Save this bus company name
              </button>
            ) : null}
            {index > 0 ? (
              <button
                type="button"
                className="text-sm text-rose"
                onClick={() => setCompanies((currentRows) => currentRows.filter((_, i) => i !== index))}
              >
                Remove this bus company
              </button>
            ) : null}
          </div>
        ))}
        {allowsMultipleCompanies(type) ? (
          <button
            type="button"
            className="text-sm text-teal hover:underline"
            onClick={() => setCompanies((currentRows) => [...currentRows, emptyCompany()])}
          >
            Add another bus company
          </button>
        ) : null}
        {companyError ? <p className="text-sm text-rose">{companyError}</p> : null}
      </div>
    );
  }

  function contractDateFields() {
    return (
      <>
        <Field
          label="Contract start date"
          hint="Each contract can have different dates. Leave blank on a new packet if you do not know yet."
        >
          <input className={inputClass} type="date" name="startsOn" />
        </Field>
        <Field label="Contract end date" hint="Used to check insurance coverage for the full contract run.">
          <input className={inputClass} type="date" name="endsOn" />
        </Field>
      </>
    );
  }

  function currentExtras() {
    if (!current) return null;
    return (
      <>
        <ReviewerFields reviewers={reviewers} reviewerNames={reviewerNames} />
        <Field label="Date sent to district">
          <input className={inputClass} type="date" name="sentToDistrictAt" />
        </Field>
        <Field label="Insurance expiration date" hint="Filed on this bus company and district. You can add the certificate file later under Insurance.">
          <input className={inputClass} type="date" name="insuranceExpiresAt" />
        </Field>
        <Field label="Notes" className="md:col-span-2">
          <textarea className={inputClass} name="notes" rows={2} />
        </Field>
      </>
    );
  }

  if (type === "addendum") {
    return (
      <div className="space-y-5">
        <TypeBanner type={type} href={changeTypeHref} />
        <form onSubmit={onFind} className="grid gap-4 md:grid-cols-2">
          <Field label="School year">
            <input className={inputClass} value={findYear} onChange={(e) => setFindYear(e.target.value)} required />
          </Field>
          <Field label="Multi-contract number" hint="This must already be on file.">
            <input className={inputClass} value={findMulti} onChange={(e) => setFindMulti(e.target.value)} required />
          </Field>
          <Field label="District (optional)" hint="Use this if more than one district could have the same number.">
            <select className={inputClass} value={findDistrictId} onChange={(e) => setFindDistrictId(e.target.value)}>
              <option value="">Any district</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{districtOptionLabel(d.name, d.county)}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="submit">Find this contract</Button>
          </div>
        </form>
        {findError ? <p className="text-sm text-rose">{findError}</p> : null}
        {matches && matches.length ? (
          <div className="space-y-3 rounded-xl border border-line bg-cream px-4 py-4">
            <p className="font-medium">Is this the contract the addendum belongs to?</p>
            {matches.map((row) => (
              <label key={row.id} className="flex gap-3 rounded-xl bg-white px-3 py-3">
                <input
                  type="radio"
                  name="previewContract"
                  checked={pickedId === row.id}
                  onChange={() => {
                    setPickedId(row.id);
                    setConfirmed(false);
                    setRouteIds([]);
                  }}
                />
                <span>
                  <span className="font-medium">{row.multiContractNumber}</span>
                  {" · "}
                  {row.districtName}
                  {" · "}
                  {row.contractorNames}
                  {" · "}
                  {intakeTypeLabel(row.type)}
                  {" · status "}
                  {row.statusName}
                  <span className="mt-1 block text-sm text-muted">
                    Routes on file: {row.routes.map((route) => route.number).join(", ") || "none yet"}
                  </span>
                </span>
              </label>
            ))}
            {picked ? (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>
                  Yes, link this addendum to {picked.multiContractNumber} ({picked.districtName} / {picked.contractorNames}). Do not create a separate addendum contract.
                </span>
              </label>
            ) : null}
          </div>
        ) : null}

        {picked && confirmed ? (
          <form action={action} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="source" value={source} />
            <input type="hidden" name="mode" value="intake" />
            <input type="hidden" name="type" value="addendum" />
            <input type="hidden" name="confirmAddendumLink" value="yes" />
            <input type="hidden" name="linkedContractId" value={picked.id} />
            <input type="hidden" name="schoolYear" value={picked.schoolYear} />
            <input type="hidden" name="multiContractNumber" value={picked.multiContractNumber} />
            <Field label="Date received">
              <input className={inputClass} type="date" name="receivedDate" />
            </Field>
            <Field
              label="Route number"
              hint="Pick a route already on this contract. If the route is missing, open that contract and add the route first."
              className="md:col-span-2"
            >
              <div className="space-y-2">
                {picked.routes.map((route) => (
                  <label key={route.id} className="flex gap-2">
                    <input
                      type="checkbox"
                      name="addendumRouteId"
                      value={route.id}
                      checked={routeIds.includes(route.id)}
                      onChange={(e) =>
                        setRouteIds((currentIds) =>
                          e.target.checked ? [...currentIds, route.id] : currentIds.filter((id) => id !== route.id)
                        )
                      }
                    />
                    {route.number}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Bid number">
              <input className={inputClass} name="bidNumber" />
            </Field>
            <Field label="Renewal number">
              <input className={inputClass} name="renewalNumber" />
            </Field>
            <Field label="Status" hint="This updates the contract this addendum is linked to.">
              <select className={inputClass} name="statusName" defaultValue={picked.statusName}>
                {statuses.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </Field>
            {currentExtras()}
            <div>
              <Button type="submit">{current ? "Link current addendum" : "Link addendum"}</Button>
            </div>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <TypeBanner type={type} href={changeTypeHref} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="mode" value="intake" />
      <input type="hidden" name="type" value={type} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Date received">
          <input className={inputClass} type="date" name="receivedDate" />
        </Field>
        {contractDateFields()}
        <Field label="School year">
          <input className={inputClass} name="schoolYear" required defaultValue={schoolYear} />
        </Field>

        {usesHostJoiner(type) ? (
          <>
            <DistrictPickerField
              label="Host district"
              hint="The host is the district this joint is filed under."
              name="hostDistrictId"
              districts={districts}
              required
            />
            <JoinerDistrictFields districts={districts} />
          </>
        ) : (
          <DistrictPickerField label="District" name="districtId" districts={districts} required />
        )}

        {usesParentName(type) ? (
          <Field label="Parent name" hint="The parent who is transporting only their own child.">
            <input className={inputClass} name="parentName" required placeholder="Parent name" />
          </Field>
        ) : usesBusCompany(type) ? (
          companyFields()
        ) : null}

        {allowsMultiplePackets(type) ? (
          <div className="md:col-span-2 space-y-3 rounded-xl border border-line bg-cream px-4 py-3">
            <p className="font-medium">Multi-contract numbers</p>
            <p className="text-sm text-muted">
              Add each multi-contract number on this renewal, with the route number and renewal number that go with it.
            </p>
            {packets.map((packet, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-3">
                <Field label="Multi-contract number">
                  <input
                    className={inputClass}
                    name="packetMulti"
                    required={index === 0}
                    value={packet.multiContractNumber}
                    onChange={(e) =>
                      setPackets((currentPackets) =>
                        currentPackets.map((row, i) =>
                          i === index ? { ...row, multiContractNumber: e.target.value } : row
                        )
                      )
                    }
                  />
                </Field>
                <Field label="Route number" hint="One or more, separated by commas.">
                  <input
                    className={inputClass}
                    name="packetRoute"
                    required={index === 0}
                    value={packet.routeNumber}
                    onChange={(e) =>
                      setPackets((currentPackets) =>
                        currentPackets.map((row, i) => (i === index ? { ...row, routeNumber: e.target.value } : row))
                      )
                    }
                  />
                </Field>
                <Field label="Renewal number">
                  <input
                    className={inputClass}
                    name="packetRenewal"
                    value={packet.renewalNumber}
                    onChange={(e) =>
                      setPackets((currentPackets) =>
                        currentPackets.map((row, i) => (i === index ? { ...row, renewalNumber: e.target.value } : row))
                      )
                    }
                  />
                </Field>
                {index > 0 ? (
                  <button
                    type="button"
                    className="text-sm text-rose md:col-span-3"
                    onClick={() => setPackets((currentPackets) => currentPackets.filter((_, i) => i !== index))}
                  >
                    Remove this multi-contract number
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-teal hover:underline"
              onClick={() =>
                setPackets((currentPackets) => [
                  ...currentPackets,
                  { multiContractNumber: "", routeNumber: "", renewalNumber: "" },
                ])
              }
            >
              Add another multi-contract number
            </button>
          </div>
        ) : (
          <>
            <Field label="Multi-contract number">
              <input className={inputClass} name="multiContractNumber" required />
            </Field>
            <Field label="Route number" hint="One or more, separated by commas or on their own lines.">
              <textarea className={inputClass} name="routes" rows={3} />
            </Field>
          </>
        )}

        {showsBidNumber(type) ? (
          <Field label="Bid number">
            <input className={inputClass} name="bidNumber" />
          </Field>
        ) : null}
        {showsRenewalNumber(type) && !allowsMultiplePackets(type) ? (
          <Field label="Renewal number">
            <input className={inputClass} name="renewalNumber" />
          </Field>
        ) : null}

        <Field label="Status">
          <select className={inputClass} name="statusName" defaultValue="Need Review">
            {statuses.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </Field>
        {currentExtras()}
      </div>
      <Button type="submit">{current ? "Save current contract" : "Save incoming contract"}</Button>
    </form>
  );
}

function TypeBanner({ type, href }: { type: IntakeType; href: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-teal-soft px-4 py-3">
      <p className="font-medium">Entering {intakeTypeLabel(type).toLowerCase()}</p>
      <a className="text-sm text-teal hover:underline" href={href}>
        Change type
      </a>
    </div>
  );
}
