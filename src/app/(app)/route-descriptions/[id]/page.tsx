import { notFound } from "next/navigation";
import { saveRouteDescription, softDelete } from "@/app/actions";
import { ChecklistRow } from "@/components/client-forms";
import { Button, Card, Field, Flag, PageHeader, StatusChip, inputClass } from "@/components/ui";
import { activeDistricts, ensureChecklist, getStatuses } from "@/lib/data";
import { hasRequiredRouteWording } from "@/lib/extract-routes";
import { prisma } from "@/lib/prisma";

export default async function RouteDescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.routeDescription.findFirst({
    where: { id, deletedAt: null },
    include: { district: true, lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!row) notFound();
  const [districts, statuses, checklist] = await Promise.all([
    activeDistricts(),
    getStatuses("route_description"),
    ensureChecklist("route_description", row.id),
  ]);
  const wording = hasRequiredRouteWording(`${row.content || ""} ${row.extractedText || ""}`);
  async function remove() {
    "use server";
    await softDelete("route_description", id, "/route-descriptions");
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title={row.destination || row.title}
        backHref="/route-descriptions"
        hint={`${row.district.name} · ${row.kind === "emergency_quote" ? "Emergency quote" : "Bid route description"}`}
        actions={<form action={remove}><button className="rounded-xl bg-rose-soft px-4 py-2.5 text-rose" type="submit">Remove</button></form>}
      />
      <StatusChip name={row.statusName} />
      {wording ? (
        <Flag tone="sage">The packet has the required wording: ROUTE NO., DESTINATION, and THE STARTING DATE OF THIS ROUTE IS.</Flag>
      ) : (
        <Flag tone="amber">We did not find all of the required route-description wording yet. Check the scan or type the missing lines.</Flag>
      )}
      {row.filePath ? (
        <a className="text-teal" href={`/api/files?path=${encodeURIComponent(row.filePath)}`}>Open uploaded packet</a>
      ) : null}
      <Card>
        <h2 className="serif mb-3 text-2xl">Routes pulled from the packet</h2>
        {row.lines.length === 0 ? (
          <p className="text-muted">No routes were separated yet. Upload a clearer scan or type the route numbers.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-line text-sm text-muted">
                <tr>
                  <th className="py-2 font-medium">Route</th>
                  <th className="py-2 font-medium">Destination</th>
                  <th className="py-2 font-medium">Start time</th>
                  <th className="py-2 font-medium">End time</th>
                  <th className="py-2 font-medium">Start date</th>
                  <th className="py-2 font-medium">End date</th>
                </tr>
              </thead>
              <tbody>
                {row.lines.map((line) => (
                  <tr key={line.id} className="border-b border-line/70">
                    <td className="py-2">{line.routeNumber}</td>
                    <td className="py-2">{line.destination || "—"}</td>
                    <td className="py-2">{line.startTime || "—"}</td>
                    <td className="py-2">{line.endTime || "—"}</td>
                    <td className="py-2">{line.startDate || "—"}</td>
                    <td className="py-2">{line.endDate || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card>
        <h2 className="serif mb-3 text-2xl">Checklist</h2>
        <div className="space-y-3">{checklist.map((item) => <ChecklistRow key={item.id} item={item} />)}</div>
      </Card>
      <Card>
        <form action={saveRouteDescription} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={row.id} />
          <Field label="District">
            <select className={inputClass} name="districtId" defaultValue={row.districtId}>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="School year"><input className={inputClass} name="schoolYear" defaultValue={row.schoolYear} /></Field>
          <Field label="What is this packet?">
            <select className={inputClass} name="kind" defaultValue={row.kind}>
              <option value="bid">Bid route description approval</option>
              <option value="emergency_quote">Emergency quote</option>
            </select>
          </Field>
          <Field label="Destination">
            <input className={inputClass} name="destination" defaultValue={row.destination || row.title} />
          </Field>
          <Field label="Replace scan" className="md:col-span-2">
            <input className={inputClass} type="file" name="file" />
          </Field>
          <Field label="Route numbers" className="md:col-span-2">
            <input className={inputClass} name="routeNumbers" defaultValue={row.routeNumbers} />
          </Field>
          <Field label="Notes or typed description" className="md:col-span-2">
            <textarea className={inputClass} name="content" rows={6} defaultValue={row.content ?? ""} />
          </Field>
          <Field label="Status">
            <select className={inputClass} name="statusName" defaultValue={row.statusName}>
              {statuses.map((s) => <option key={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <div><Button type="submit">Save</Button></div>
        </form>
      </Card>
    </div>
  );
}
