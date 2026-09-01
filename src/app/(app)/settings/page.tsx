import Link from "next/link";
import { saveDistrictAddresses, saveSettings, uploadTemplate } from "@/app/actions";
import { CollapsibleBlock, CollapsibleSection } from "@/components/collapsible";
import { Button, Field, PageHeader, inputClass } from "@/components/ui";
import { getSetting } from "@/lib/data";
import { outlookConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { CONTRACT_TYPES, contractLetterTemplateKey } from "@/lib/utils";

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

function addressPreview(district: { street: string | null; city: string | null; state: string | null; zip: string | null }) {
  const parts = [district.street, district.city, district.state, district.zip].filter(Boolean);
  return parts.length ? parts.join(", ") : "No address yet";
}

function letterHint(byKey: Record<string, string>, type: string) {
  const approved = byKey[contractLetterTemplateKey("approved", type)];
  const disapproved = byKey[contractLetterTemplateKey("disapproved", type)];
  if (approved && disapproved) return "Approval and disapproval letters uploaded";
  if (approved) return "Approval letter uploaded";
  if (disapproved) return "Disapproval letter uploaded";
  return "Using the default or built-in letters until you upload";
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
      <PageHeader
        title="Settings"
        hint="School year, CPI, letters, people, and statuses. Click a heading to open that section; click it again to close it."
      />
      <div className="flex flex-wrap gap-3">
        <Button href="/settings/users" variant="secondary">Users and permissions</Button>
        <Button href="/settings/statuses" variant="secondary">Statuses</Button>
        <Button href="/districts" variant="secondary">Districts</Button>
      </div>
      <CollapsibleSection title="Office settings" hint="School year, CPI, bid threshold, office contact, and 2nd-review alerts">
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
      </CollapsibleSection>
      <CollapsibleSection
        title="District letter addresses"
        hint={
          districts.length
            ? `${districts.length} districts — click a district to edit its mailing address`
            : "Add districts first, then come back here"
        }
      >
        <p className="mb-4 text-muted">
          Each district has its own mailing address. Letters use the address on the contract’s district — not a shared county address. You can also edit one district at a time under Districts.
        </p>
        {districts.length === 0 ? (
          <p className="text-muted">Add districts first, then come back here to enter their addresses.</p>
        ) : (
          <form action={saveDistrictAddresses} className="space-y-3">
            <div className="max-h-[min(24rem,50vh)] space-y-3 overflow-y-auto pr-1">
              {districts.map((district) => (
                <CollapsibleBlock key={district.id} title={district.name} hint={addressPreview(district)}>
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
                  </div>
                </CollapsibleBlock>
              ))}
            </div>
            <Button type="submit">Save district addresses</Button>
          </form>
        )}
      </CollapsibleSection>
      <CollapsibleSection title="Letters by contract type" hint="Upload a different approval and disapproval letter for original, renewal, quote, parental, addendum, and joint">
        <p className="mb-4 text-muted">
          A parental contract uses the parental letters, a renewal uses the renewal letters, and so on. If a type has no file yet, we use the default letter or the built-in one. Merge fields: {"{district}"}, {"{districtAddress}"}, {"{street}"}, {"{city}"}, {"{state}"}, {"{zip}"}, {"{contractor}"}, {"{letterDate}"}, {"{multiContractNumber}"}, {"{routes}"}, {"{schoolYear}"}, {"{type}"}, {"{missingItems}"}.
        </p>
        <div className="space-y-3">
          {CONTRACT_TYPES.map((type) => (
            <CollapsibleBlock key={type.value} title={type.label} hint={letterHint(byKey, type.value)}>
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
            </CollapsibleBlock>
          ))}
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Default letters, annual certs, and PT-4" hint="Fallback Word files used when a contract type has no letter of its own">
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
      </CollapsibleSection>
      <p className="text-sm text-muted">
        Need a reminder of who can do what? Open <Link className="text-teal" href="/settings/users">Users and permissions</Link>.
      </p>
    </div>
  );
}
