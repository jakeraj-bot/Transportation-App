import Link from "next/link";
import { saveSettings, uploadTemplate } from "@/app/actions";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { getSetting } from "@/lib/data";
import { outlookConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const TEMPLATES = [
  ["contract_approved", "Contract approval letter"],
  ["contract_disapproved", "Contract disapproval letter"],
  ["cert_approved", "Annual cert approval letter"],
  ["cert_disapproved", "Annual cert disapproval letter"],
  ["pt4", "PT-4 form"],
];

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
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" hint="School year, CPI, letters, people, and statuses." />
      <div className="flex flex-wrap gap-3">
        <Button href="/settings/users" variant="secondary">Users and permissions</Button>
        <Button href="/settings/statuses" variant="secondary">Statuses</Button>
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
        <h2 className="serif mb-2 text-2xl">Word templates</h2>
        <p className="mb-4 text-muted">Upload your letterhead documents. Use merge fields like {"{district}"}, {"{contractor}"}, {"{letterDate}"}, {"{multiContractNumber}"}, {"{routes}"}, {"{schoolYear}"}, {"{missingItems}"}.</p>
        <div className="space-y-4">
          {TEMPLATES.map(([key, label]) => {
            const existing = templates.find((t) => t.key === key);
            return (
              <form key={key} action={uploadTemplate} className="grid gap-2 rounded-xl border border-line p-4 md:grid-cols-[1fr_auto_auto] md:items-end">
                <input type="hidden" name="key" value={key} />
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted">{existing ? `Current file: ${existing.originalName}` : "Using the built-in letter until you upload one."}</p>
                </div>
                <input className={inputClass} type="file" name="file" accept=".docx" required />
                <Button type="submit">Upload</Button>
              </form>
            );
          })}
        </div>
      </Card>
      <p className="text-sm text-muted">
        Need a reminder of who can do what? Open <Link className="text-teal" href="/settings/users">Users and permissions</Link>.
      </p>
    </div>
  );
}
