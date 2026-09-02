import { redirect } from "next/navigation";
import Link from "next/link";
import { saveSettings } from "@/app/actions";
import { CollapsibleBlock, CollapsibleSection } from "@/components/collapsible";
import { HomePrefsForm } from "@/components/home-prefs-form";
import { TemplateUploadForm } from "@/components/template-upload";
import { Button, Field, Flag, PageHeader, inputClass } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getSetting } from "@/lib/data";
import { outlookConfigured } from "@/lib/email";
import { parseHomePrefs } from "@/lib/home-prefs";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import { CONTRACT_TYPES, contractLetterTemplateKey, formatCurrency, formatPercent } from "@/lib/utils";

const SHARED_TEMPLATES = [
  ["contract_approved", "Default contract approval letter"],
  ["contract_disapproved", "Default contract disapproval letter"],
  ["cert_approved", "Annual cert approval letter"],
  ["cert_disapproved", "Annual cert disapproval letter"],
  ["pt4", "PT-4 form"],
] as const;

function letterHint(byKey: Record<string, string>, type: string) {
  const approved = byKey[contractLetterTemplateKey("approved", type)];
  const disapproved = byKey[contractLetterTemplateKey("disapproved", type)];
  if (approved && disapproved) return "Approval and disapproval letters uploaded";
  if (approved) return "Approval letter uploaded";
  if (disapproved) return "Disapproval letter uploaded";
  return "Using the default or built-in letters until you upload";
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string; uploadError?: string; homeSaved?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const admin = isSuperAdmin(session.role);
  const [{ uploaded, uploadError, homeSaved }, schoolYear, cpi, bidThreshold, officeName, officeEmail, alertOn, alertHours, templates, me] =
    await Promise.all([
      searchParams,
      getSetting("schoolYear"),
      getSetting("cpi"),
      getSetting("bidThreshold"),
      getSetting("officeName"),
      getSetting("officeEmail"),
      getSetting("secondReviewAlertOn", "off"),
      getSetting("secondReviewAlertHours", "48"),
      admin ? prisma.templateFile.findMany() : Promise.resolve([]),
      prisma.user.findUnique({ where: { id: session.id } }),
    ]);
  const byKey = Object.fromEntries(templates.map((t) => [t.key, t.originalName]));
  const prefs = parseHomePrefs(me?.homePrefs);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        hint={
          admin
            ? "School year, CPI, letters, people, and statuses. Click a heading to open that section; click it again to close it."
            : "Change how your Home screen looks. Office letters, users, statuses, and district records are only changed by Super Admin."
        }
      />
      {homeSaved ? <Flag tone="sage">Your Home screen settings were saved.</Flag> : null}
      <CollapsibleSection title="My home screen" hint="Colors (including your own hex), more fonts to click as samples, letter size, buttons, compact layout, and which Home cards you want to see">
        <HomePrefsForm prefs={prefs} />
      </CollapsibleSection>
      {admin ? (
        <>
          <div className="flex flex-wrap gap-3">
            <Button href="/settings/users" variant="secondary">Users and permissions</Button>
            <Button href="/settings/statuses" variant="secondary">Statuses</Button>
          </div>
          {uploaded ? <Flag tone="sage">The Word letter was saved. It will be used the next time you print that type of approval or disapproval letter.</Flag> : null}
          {uploadError ? <Flag tone="rose">{uploadError}</Flag> : null}
          <CollapsibleSection title="Office settings" hint="School year, CPI, bid threshold, office contact, and 2nd-review alerts">
            <form action={saveSettings} className="grid gap-4 md:grid-cols-2">
              <Field label="Current school year"><input className={inputClass} name="schoolYear" defaultValue={schoolYear} /></Field>
              <Field label="CPI for renewals" hint="Enter a percent, for example 2.50 for a 2.50% cap.">
                <div className="relative">
                  <input className={`${inputClass} pr-10`} name="cpi" defaultValue={formatPercent(cpi)} inputMode="decimal" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">%</span>
                </div>
              </Field>
              <Field label="Bid threshold" hint="Used to flag quotes that look over the limit.">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input className={`${inputClass} pl-7`} name="bidThreshold" defaultValue={formatCurrency(bidThreshold)} inputMode="decimal" />
                </div>
              </Field>
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
              Emails: the office cannot send from this app until the state gives mailbox access. Prepare the message on the contract or insurance page, copy it, and paste it into your work Outlook. If Outlook is ever connected here, a Send button will appear. Status now: {outlookConfigured() ? "connected." : "not connected."}
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
                  Header fields: {"{letterDate}"}, {"{districtContact}"}, {"{districtContactPosition}"}, {"{districtName}"}, {"{schoolYear}"}. Address on two lines: {"{districtAddress}"} (street) then {"{city}, {state} {zipCode}"}. Do not put city, state, or ZIP inside {"{districtAddress}"} — those have their own fields. If you want the whole mailing address in one field, use {"{addressBlock}"} instead of those two lines. Parental also uses {"{parentName}"}. Joint also uses {"{hostDistrict}"}, {"{jointDistrict}"}, {"{dateReceived}"}. Addendum also uses {"{routeNumber}"}, {"{addendumNumber}"}.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {CONTRACT_TYPES.map((type) => (
                <CollapsibleBlock key={type.value} title={type.label} hint={letterHint(byKey, type.value)}>
                  <TemplateUploadForm
                    templateKey={contractLetterTemplateKey("approved", type.value)}
                    label="Approval letter"
                    hint="Using the default or built-in approval letter until you upload one."
                    originalName={byKey[contractLetterTemplateKey("approved", type.value)]}
                  />
                  <TemplateUploadForm
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
                <TemplateUploadForm
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
        </>
      ) : (
        <p className="text-sm text-muted">
          You can view district information under Districts. Super Admin can turn on “Edit district names and letter addresses” if you should be allowed to change it.
        </p>
      )}
    </div>
  );
}
