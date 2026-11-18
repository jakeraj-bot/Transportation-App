import { saveContractorCodes, saveContractorRegistration } from "@/app/actions";
import { OpenBrcSearchButton } from "@/components/open-brc-search-button";
import { formatDate, nameControlFrom } from "@/lib/utils";

const controlClass = "w-full rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink";

export function ContractVendorForm({
  contractId,
  contractorId,
  vendorCode,
  ospCode,
  saved,
}: {
  contractId: string;
  contractorId: string;
  vendorCode?: string | null;
  ospCode?: string | null;
  saved?: boolean;
}) {
  return (
    <form action={saveContractorCodes} className="mt-2 space-y-1.5">
      <input type="hidden" name="contractorId" value={contractorId} />
      <input type="hidden" name="returnTo" value={`/contracts/${contractId}`} />
      <input
        className={controlClass}
        name="vendorCode"
        aria-label="Vendor code"
        placeholder="Vendor code"
        defaultValue={vendorCode ?? ""}
      />
      <input
        className={controlClass}
        name="ospCode"
        aria-label="OSP code"
        placeholder="OSP code"
        defaultValue={ospCode ?? ""}
      />
      <button type="submit" className="rounded-lg bg-teal px-2 py-1 text-sm font-medium text-white">
        Save
      </button>
      {saved ? <p className="text-xs text-teal">Saved on the contractor file.</p> : null}
    </form>
  );
}

export function ContractRegistrationForm({
  contractId,
  contractorId,
  legalName,
  brcNumber,
  brcNameControl,
  brcStatus,
  brcVerifiedAt,
  saved,
}: {
  contractId: string;
  contractorId: string;
  legalName: string;
  brcNumber?: string | null;
  brcNameControl?: string | null;
  brcStatus?: string | null;
  brcVerifiedAt?: Date | null;
  saved?: boolean;
}) {
  const nameControl = brcNameControl || nameControlFrom(legalName);
  return (
    <form action={saveContractorRegistration} className="mt-2 space-y-1.5">
      <input type="hidden" name="contractorId" value={contractorId} />
      <input type="hidden" name="returnTo" value={`/contracts/${contractId}`} />
      <select className={controlClass} name="brcStatus" aria-label="Business registration status" defaultValue={brcStatus || "Not on file"}>
        <option>Not on file</option>
        <option>Valid</option>
        <option>Could not verify</option>
      </select>
      <input
        className={controlClass}
        name="brcNumber"
        aria-label="BRC certificate number"
        placeholder="Certificate number"
        defaultValue={brcNumber ?? ""}
      />
      <input
        className={controlClass}
        name="brcNameControl"
        aria-label="Taxpayer name, first 4 letters"
        placeholder="Name control"
        maxLength={4}
        defaultValue={nameControl}
      />
      <label className="flex items-start gap-1.5 text-xs text-ink">
        <input type="checkbox" name="markVerified" className="mt-0.5" />
        <span>I checked the Treasury site — mark verified today</span>
      </label>
      <OpenBrcSearchButton />
      <button type="submit" className="rounded-lg bg-teal px-2 py-1 text-sm font-medium text-white">
        Save
      </button>
      {brcVerifiedAt ? <p className="text-xs text-muted">Verified {formatDate(brcVerifiedAt)}</p> : null}
      {saved ? <p className="text-xs text-teal">Saved on the contractor file.</p> : null}
    </form>
  );
}
