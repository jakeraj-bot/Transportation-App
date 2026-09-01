import Link from "next/link";
import { notFound } from "next/navigation";
import { saveAddendum } from "@/app/actions";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDate, toInputDate } from "@/lib/utils";

export default async function RouteAddendumPage({
  params,
}: {
  params: Promise<{ id: string; routeId: string }>;
}) {
  const { id, routeId } = await params;
  const route = await prisma.route.findFirst({
    where: { id: routeId, contractId: id },
    include: {
      contract: { include: { district: true, contractor: true } },
      addenda: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!route) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Route ${route.number}`}
        backHref={`/contracts/${id}`}
        hint={`${route.contract.district.name} · ${route.contract.multiContractNumber} · ${route.contract.contractor.legalName}`}
      />
      {route.addenda.length === 0 ? (
        <Card>
          <p className="text-muted">This route does not have an addendum yet. Addendums are corrections to a route, not to the multi-contract number.</p>
        </Card>
      ) : (
        route.addenda.map((addendum) => (
          <Card key={addendum.id}>
            <h2 className="serif mb-1 text-2xl">{addendum.reason}</h2>
            <p className="mb-4 text-sm text-muted">
              Received {formatDate(addendum.receivedDate)} · Board {formatDate(addendum.boardMeetingDate)}
              {addendum.costChange != null ? ` · Cost change ${addendum.costChange}` : ""}
            </p>
            <form action={saveAddendum} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="id" value={addendum.id} />
              <input type="hidden" name="routeId" value={route.id} />
              <Field label="What the addendum was for" className="md:col-span-2">
                <input className={inputClass} name="reason" defaultValue={addendum.reason} required />
              </Field>
              <Field label="Details" className="md:col-span-2">
                <textarea className={inputClass} name="description" rows={4} defaultValue={addendum.description ?? ""} />
              </Field>
              <Field label="Increase / decrease (decimal)">
                <input className={inputClass} name="costChange" defaultValue={addendum.costChange ?? ""} />
              </Field>
              <Field label="Board meeting date">
                <input className={inputClass} type="date" name="boardMeetingDate" defaultValue={toInputDate(addendum.boardMeetingDate)} />
              </Field>
              <Field label="Date received">
                <input className={inputClass} type="date" name="receivedDate" defaultValue={toInputDate(addendum.receivedDate)} />
              </Field>
              <Field label="Notes">
                <textarea className={inputClass} name="notes" rows={2} defaultValue={addendum.notes ?? ""} />
              </Field>
              <div><Button type="submit">Save addendum</Button></div>
            </form>
          </Card>
        ))
      )}
      <Card>
        <h2 className="serif mb-4 text-2xl">Add an addendum to this route</h2>
        <form action={saveAddendum} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="routeId" value={route.id} />
          <Field label="What the addendum was for" className="md:col-span-2" hint="Example: stop change, calendar change, aide added.">
            <input className={inputClass} name="reason" required />
          </Field>
          <Field label="Details" className="md:col-span-2">
            <textarea className={inputClass} name="description" rows={4} />
          </Field>
          <Field label="Increase / decrease (decimal)">
            <input className={inputClass} name="costChange" />
          </Field>
          <Field label="Board meeting date">
            <input className={inputClass} type="date" name="boardMeetingDate" />
          </Field>
          <Field label="Date received">
            <input className={inputClass} type="date" name="receivedDate" />
          </Field>
          <Field label="Notes">
            <textarea className={inputClass} name="notes" rows={2} />
          </Field>
          <div><Button type="submit">Add addendum</Button></div>
        </form>
        <p className="mt-4 text-sm text-muted">
          <Link className="text-teal" href={`/contracts/${id}`}>Back to the contract</Link>
        </p>
      </Card>
    </div>
  );
}
