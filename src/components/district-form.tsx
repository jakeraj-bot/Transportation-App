import { saveDistrict } from "@/app/actions";
import { Button, Field, inputClass } from "@/components/ui";

type DistrictValues = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  contactPosition: string | null;
  code: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
};

export function DistrictForm({
  district,
  returnTo,
  fields = "all",
  readOnly = false,
}: {
  district?: DistrictValues;
  returnTo?: string;
  fields?: "all" | "identity" | "address";
  readOnly?: boolean;
}) {
  const showIdentity = fields === "all" || fields === "identity";
  const showAddress = fields === "all" || fields === "address";
  const inputProps = readOnly ? { readOnly: true, disabled: true } : {};
  return (
    <form action={saveDistrict} className="grid gap-4 md:grid-cols-2">
      {district ? <input type="hidden" name="id" value={district.id} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {showIdentity ? (
        <>
          <Field label="District name" className="md:col-span-2" hint="This is the name printed on letters. Change it here if the district’s name has changed.">
            <input className={inputClass} name="name" required defaultValue={district?.name} {...inputProps} />
          </Field>
          <Field label="Letter contact name" hint="Fills {districtContact} on approval letters.">
            <input className={inputClass} name="contactName" defaultValue={district?.contactName ?? ""} {...inputProps} />
          </Field>
          <Field label="Letter contact position" hint="Fills {districtContactPosition}, for example Superintendent.">
            <input className={inputClass} name="contactPosition" defaultValue={district?.contactPosition ?? ""} {...inputProps} />
          </Field>
          <Field label="Transportation email" hint="Used for PT-4s and insurance follow-up.">
            <input className={inputClass} name="email" type="email" defaultValue={district?.email ?? ""} {...inputProps} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} name="phone" defaultValue={district?.phone ?? ""} {...inputProps} />
          </Field>
          <Field label="Code">
            <input className={inputClass} name="code" defaultValue={district?.code ?? ""} {...inputProps} />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <textarea className={inputClass} name="notes" rows={3} defaultValue={district?.notes ?? ""} {...inputProps} />
          </Field>
        </>
      ) : district ? (
        <>
          <input type="hidden" name="name" value={district.name} />
          <input type="hidden" name="contactName" value={district.contactName ?? ""} />
          <input type="hidden" name="contactPosition" value={district.contactPosition ?? ""} />
          <input type="hidden" name="email" value={district.email ?? ""} />
          <input type="hidden" name="phone" value={district.phone ?? ""} />
          <input type="hidden" name="code" value={district.code ?? ""} />
          <input type="hidden" name="notes" value={district.notes ?? ""} />
        </>
      ) : null}
      {showAddress ? (
        <>
          <Field
            label="Street for letters"
            className="md:col-span-2"
            hint="Printed on this district’s approval, disapproval, and PT-4 letters."
          >
            <input className={inputClass} name="street" defaultValue={district?.street ?? ""} {...inputProps} />
          </Field>
          <Field label="City">
            <input className={inputClass} name="city" defaultValue={district?.city ?? ""} {...inputProps} />
          </Field>
          <Field label="State">
            <input className={inputClass} name="state" defaultValue={district?.state ?? ""} placeholder="NJ" {...inputProps} />
          </Field>
          <Field label="ZIP">
            <input className={inputClass} name="zip" defaultValue={district?.zip ?? ""} {...inputProps} />
          </Field>
        </>
      ) : district ? (
        <>
          <input type="hidden" name="street" value={district.street ?? ""} />
          <input type="hidden" name="city" value={district.city ?? ""} />
          <input type="hidden" name="state" value={district.state ?? ""} />
          <input type="hidden" name="zip" value={district.zip ?? ""} />
        </>
      ) : null}
      {readOnly ? (
        <p className="md:col-span-2 text-sm text-muted">
          You can view this district. Super Admin can give you permission to make changes.
        </p>
      ) : (
        <div>
          <Button type="submit">Save district</Button>
        </div>
      )}
    </form>
  );
}
