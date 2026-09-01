import Link from "next/link";
import { saveSettings, uploadTemplate } from "@/app/actions";
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

function letterHint(byKey: Record<string, string>, type: string) {
  const approved = byKey[contractLetterTemplateKey("approved", type)];
  const disapproved = byKey[contractLetterTemplateKey("disapproved", type)];
  if (approved && disapproved) return "Approval and disapproval letters uploaded";
  if (approved) return "Approval letter uploaded";
  if (disapproved) return "Disapproval letter uploaded";
  return "Using the default or built-in letters until you upload";
}

export default async function SettingsPage() {
  const [schoolYear, cpi, bidThreshold, officeName, officeEmail, alertOn, alertHours, templates] = await Promise.all([
    getSetting("schoolYear"),
    getSetting("cpi"),
    getSetting("bidThreshold"),
    getSetting("officeName"),
    getSetting("officeEmail"),
    getSetting("secondReviewAlertOn", "off"),
    getSetting("secondReviewAlertHours", "48"),
    prisma.templateFile.findMany(),
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
      <CollapsibleSection title="Letters by contract type" hint="Upload a different approval and disapproval letter for original, renewal, quote, parental, addendum, and joint">
        <div className="mb-4 space-y-3 text-muted">
          <p>
            A parental contract uses the parental letters, a renewal uses the renewal letters, and so on. If a type has no file yet, we use the default letter or the built-in one. District names and addresses are edited under Districts, not here.
          </p>
          <p>
            For one letter that lists several contracts, keep a single data row in the Word table and wrap it in a loop. Do not paste {"{multiContractNumber}"} six times — every copy would fill with the same number.
          </p>
          <div className="rounded-xl bg-cream px-4 py-3 text-sm text-ink">
            <p className="font-medium">Table row in Word</p>
            <p className="mt-1 font-mono text-[13px]">
              {"{#contracts}{multiContractNumber}"} &nbsp;|&nbsp; {"{contractor}{/contracts}"}
            </p>
            <p className="mt-2 text-muted">
              Header fields: {"{letterDate}"}, {"{districtContact}"}, {"{districtContactPosition}"}, {"{districtName}"}, {"{districtAddress}"}, {"{city}"}, {"{state}"}, {"{zipCode}"}, {"{schoolYear}"}. Parental also uses {"{parentName}"}. Joint also uses {"{hostDistrict}"}, {"{jointDistrict}"}, {"{dateReceived}"}. Addendum also uses {"{routeNumber}"}, {"{addendumNumber}"}.
            </p>
          </div>
        </div>
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
