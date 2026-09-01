import { saveRouteDescription } from "@/app/actions";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { activeDistricts, getSchoolYear, getStatuses } from "@/lib/data";

export default async function NewRouteDescriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const [districts, schoolYear, statuses] = await Promise.all([
    activeDistricts(),
    getSchoolYear(),
    getStatuses("route_description"),
  ]);
  return (
    <div>
      <PageHeader
        title="New route packet"
        backHref="/route-descriptions"
        hint="Choose bid approval or emergency quote. A scanned packet can include many routes — we will try to pull route number, destination, start and end time, and start and end date from each page."
      />
      <Card>
        <form action={saveRouteDescription} className="grid gap-4 md:grid-cols-2">
          <Field label="District">
            <select className={inputClass} name="districtId" required>
              <option value="">Choose</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="School year"><input className={inputClass} name="schoolYear" defaultValue={schoolYear} /></Field>
          <Field label="What is this packet?">
            <select className={inputClass} name="kind" defaultValue={kind === "emergency_quote" ? "emergency_quote" : "bid"}>
              <option value="bid">Bid route description approval</option>
              <option value="emergency_quote">Emergency quote</option>
            </select>
          </Field>
          <Field label="Destination" hint="Not a title. Use the destination from the form, such as a school name.">
            <input className={inputClass} name="destination" required />
          </Field>
          <Field label="Scan or upload the packet" className="md:col-span-2" hint="A packet can have many routes. We look for ROUTE NO., DESTINATION, Hours, and THE STARTING DATE OF THIS ROUTE IS.">
            <input className={inputClass} type="file" name="file" />
          </Field>
          <Field label="Route numbers if you already know them" className="md:col-span-2">
            <input className={inputClass} name="routeNumbers" placeholder="CCS1Q, CCS2Q" />
          </Field>
          <Field label="Notes or typed description" className="md:col-span-2">
            <textarea className={inputClass} name="content" rows={6} />
          </Field>
          <Field label="Status">
            <select className={inputClass} name="statusName">{statuses.map((s) => <option key={s.id}>{s.name}</option>)}</select>
          </Field>
          <div><Button type="submit">Save packet</Button></div>
        </form>
      </Card>
    </div>
  );
}
