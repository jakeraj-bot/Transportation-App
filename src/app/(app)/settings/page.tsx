import Link from "next/link";
import { saveDistrictAddresses, saveSettings, uploadTemplate } from "@/app/actions";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { contractLetterTemplateKey } from "@/lib/utils";
import { getSetting } from "@/lib/data";
import { outlookConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { CONTRACT_TYPES } from "@/lib/utils";

const SHARED_TEMPLATES = [
  ["contract_approved", "Default contract approval letter"],
  ["contract_disapproved", "Default contract disapproval letter"],
  ["cert_approved", "Annual cert approval letter"],
  ["cert_disapproved", "Annual cert disapproval letter"],
  ["pt4", "PT-4 form"],
] as const;

function TemplateRow({
  templateKey,
  label,
  hint,
  originalName,
}: {
  templateKey: string;
  label: string;
  hint: string;
  originalName?: string;
}) {
  return (
    <form action={uploadTemplate} className="grid gap-2 rounded-xl border border-line p-4 md:grid-cols-[1fr_auto_auto] md:items-end">
      <input type="hidden" name="key" value={templateKey} />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted">{originalName ? `Current file: ${originalName}` : hint}</p>
      </div>
      <input className={inputClass} type="file" name="file" accept=".docx" required />
      <Button type="submit">Upload</Button>
    </form>
  );
}

export default async function SettingsPage() {
  const [schoolYear, cpi, bidThreshold, officeName, officeEmail, alertOn, alertHours, templates, districts] =
    await Promise.all([
      getSetting("schoolYear"),
      getSetting("cpi"),
      getSetting("bidThreshold"),
      getSetting("officeName"),
      getSetting("officeEmail"),
      getSetting("secondReviewAlertOn", "off"),
      getSetting("secondReviewAlertHours", "48"),
      prisma.templateFile.findMany(),
      prisma.district.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    ]);
  const byKey = Object.fromEntries(templates.map((t) => [t.key, t.originalName]));
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" hint="School year, CPI, letters, people, and statuses." />
      <div className="flex flex-wrap gap-3">
        <Button href="/settings/users" variant="secondary">Users and permissions</Button>
        <Button href="/settings/statuses" variant="secondary">Statuses</Button>
        <Button href="/districts" variant="secondary">Districts</Button>
      </div>
      <Card>
        <h2 className="serif mb-4 text-2xl">Office settings</h2>
        <form action={saveSettings} className="grid gap-4 md:grid-cols-2">
          <Field label="Current school year"><input className={inputClass} name="schoolYear" defaultValue={schoolYear} /></Field>
          <Field label="CPI percent for renewals" hint="Example: 2.50"><input className={inputClass} name="cpi" defaultValue={cpi} /></Field>
          <Field label="Bid threshold" hint="Used to flag quotes that look over the limit."><input className={inputClass} name="bidThreshold" defaultValue={bidThreshold} /></Field>
          <Field label="Office name"><input className={inputClass} name="officeName" defaultValue={officeName} /></Field>
          <Field label="Office email" className="md:col-span-2"><input className={inputClass} name="officeEmail" defaultValue={officeEmail} /></Field>
          <Field label="Alert when 2nd review sits too long">
            <select className={inputClass} name="secondReviewAlertOn" defaultValue={alertOn}>
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </Field>
          <Field label="Hours before the 2nd-review alert" hint="Example: 48 means two days.">
            <input className={inputClass} name="secondReviewAlertHours" defaultValue={alertHours} />
          </Field>
          <div><Button type="submit">Save settings</Button></div>
        </form>
        <p className="mt-4 text-sm text-muted">
          Outlook send: {outlookConfigured() ? "connected." : "not connected yet. Ask county IT to put MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, and MS_MAILBOX in the .env file. Emails will still be saved as drafts."}
        </p>
      </Card>
      <Card>
        <h2 className="serif mb-2 text-2xl">District letter addresses</h2>
        <p className="mb-4 text-muted">
          Each district has its own mailing address. Letters use the address on the contract’s district — not a shared county address. Fill street, city, state, and ZIP, or paste one letter-ready block. You can also edit one district at a time under Districts.
        </p>
        {districts.length === 0 ? (
          <p className="text-muted">Add districts first, then come back here to enter their addresses.</p>
        ) : (
          <form action={saveDistrictAddresses} className="space-y-4">
            {districts.map((district) => (
              <div key={district.id} className="rounded-xl border border-line p-4">
                <p className="mb-3 font-medium">{district.name}</p>
                <div className="grid gap-3 md:grid-cols-6">
                  <Field label="Street" className="md:col-span-3">
                    <input className={inputClass} name={`street_${district.id}`} defaultValue={district.street ?? ""} />
                  </Field>
                  <Field label="City" className="md:col-span-1">
                    <input className={inputClass} name={`city_${district.id}`} defaultValue={district.city ?? ""} />
                  </Field>
                  <Field label="State">
                    <input className={inputClass} name={`state_${district.id}`} defaultValue={district.state ?? ""} placeholder="NJ" />
                  </Field>
                  <Field label="ZIP">
                    <input className={inputClass} name={`zip_${district.id}`} defaultValue={district.zip ?? ""} />
                  </Field>
                  <Field
                    label="Letter-ready block (optional)"
                    className="md:col-span-6"
                    hint="Paste the full mailing block if the letter needs a suite, attention line, or anything beyond street, city, state, and ZIP. When this is filled, {districtAddress} uses it as-is."
                  >
                    <textarea
                      className={inputClass}
                      name={`addressBlock_${district.id}`}
                      rows={3}
                      defaultValue={district.addressBlock ?? ""}
                    />
                  </Field>
                </div>
              </div>
            ))}
            <Button type="submit">Save district addresses</Button>
          </form>
        )}
      </Card>
      <Card>
        <h2 className="serif mb-2 text-2xl">Word templates</h2>
        <p className="mb-4 text-muted">
          Upload your letterhead documents. Approval and disapproval letters can be different for each contract type — a parental contract uses the parental letters, a renewal uses the renewal letters, and so on. If a type has no file yet, we use the default letter or the built-in one. Merge fields: {"{district}"}, {"{districtAddress}"}, {"{street}"}, {"{city}"}, {"{state}"}, {"{zip}"}, {"{contractor}"}, {"{letterDate}"}, {"{multiContractNumber}"}, {"{routes}"}, {"{schoolYear}"}, {"{type}"}, {"{missingItems}"}.
        </p>
        <h3 className="serif mb-3 text-xl">By contract type</h3>
        <div className="space-y-6">
          {CONTRACT_TYPES.map((type) => (
            <div key={type.value} className="space-y-3 rounded-xl border border-line p-4">
              <p className="font-medium">{type.label}</p>
              <TemplateRow
                templateKey={contractLetterTemplateKey("approved", type.value)}
                label="Approval letter"
                hint="Using the default or built-in approval letter until you upload one."
                originalName={byKey[contractLetterTemplateKey("approved", type.value)]}
              />
              <TemplateRow
                templateKey={contractLetterTemplateKey("disapproved", type.value)}
                label="Disapproval letter"
                hint="Using the default or built-in disapproval letter until you upload one."
                originalName={byKey[contractLetterTemplateKey("disapproved", type.value)]}
              />
            </div>
          ))}
        </div>
        <h3 className="serif mb-3 mt-8 text-xl">Default letters, annual certs, and PT-4</h3>
        <p className="mb-4 text-sm text-muted">
          The default contract letters are used only when that contract type does not have its own file.
        </p>
        <div className="space-y-4">
          {SHARED_TEMPLATES.map(([key, label]) => (
            <TemplateRow
              key={key}
              templateKey={key}
              label={label}
              hint="Using the built-in letter until you upload one."
              originalName={byKey[key]}
            />
          ))}
        </div>
      </Card>
      <p className="text-sm text-muted">
        Need a reminder of who can do what? Open <Link className="text-teal" href="/settings/users">Users and permissions</Link>.
      </p>
    </div>
  );
}
