import Link from "next/link";
import { addContractRoutes, cancelContractRoute, restoreContractRoute } from "@/app/actions";
import { Button, Field, Flag, inputClass } from "@/components/ui";
import { formatDate, toInputDate } from "@/lib/utils";

type RouteRow = {
  id: string;
  number: string;
  cancelledAt: Date | null;
  cancelNote: string | null;
  addendaCount: number;
};

export function ContractRoutesPanel({
  contractId,
  routes,
  extraPackets,
  canEdit,
  saved,
}: {
  contractId: string;
  routes: RouteRow[];
  extraPackets: Array<{ id: string; multiContractNumber: string; routeNumber: string; renewalNumber: string | null }>;
  canEdit: boolean;
  saved?: { added?: boolean; cancelled?: string; restored?: string };
}) {
  const active = routes.filter((route) => !route.cancelledAt);
  const cancelled = routes.filter((route) => route.cancelledAt);
  const addendumTotal = routes.reduce((sum, route) => sum + route.addendaCount, 0);

  return (
    <div className="space-y-5">
      {saved?.added ? <Flag tone="sage">Route numbers were added to this contract.</Flag> : null}
      {saved?.cancelled ? <Flag tone="amber">Route {saved.cancelled} was marked cancelled. Other routes on this contract stay active.</Flag> : null}
      {saved?.restored ? <Flag tone="sage">Route {saved.restored} is active again.</Flag> : null}

      <p className="text-muted">
        Add route numbers any time. If the district cancels one route but keeps the others, cancel that route here instead of removing it from the contract.
      </p>

      {extraPackets.length ? (
        <div className="rounded-xl bg-cream px-4 py-3">
          <p className="font-medium">Additional multi-contract numbers on this renewal</p>
          <ul className="mt-2 space-y-1 text-sm">
            {extraPackets.map((packet) => (
              <li key={packet.id}>
                {packet.multiContractNumber} · route {packet.routeNumber}
                {packet.renewalNumber ? ` · renewal ${packet.renewalNumber}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canEdit ? (
        <form action={addContractRoutes} className="rounded-xl border border-line bg-cream px-4 py-4 space-y-3">
          <input type="hidden" name="contractId" value={contractId} />
          <Field
            label="Add route numbers"
            hint="One per line or separated by commas. Routes already on this contract are skipped."
            className="md:col-span-2"
          >
            <textarea className={inputClass} name="routes" rows={3} placeholder="R12&#10;R13" required />
          </Field>
          <Button type="submit">Add routes</Button>
        </form>
      ) : null}

      {routes.length === 0 ? (
        <p className="text-muted">No route numbers yet. Add them above or when you edit the contract.</p>
      ) : (
        <div className="space-y-3">
          {active.map((route) => (
            <div key={route.id} className="rounded-xl border border-line px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link className="text-lg font-medium text-teal hover:underline" href={`/contracts/${contractId}/routes/${route.id}`}>
                    Route {route.number}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    Active
                    {route.addendaCount
                      ? ` · ${route.addendaCount} addendum${route.addendaCount === 1 ? "" : "s"}`
                      : " · No addendum"}
                  </p>
                </div>
              </div>
              {canEdit ? (
                <form action={cancelContractRoute} className="mt-4 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="contractId" value={contractId} />
                  <input type="hidden" name="routeId" value={route.id} />
                  <Field label="Date district cancelled this route">
                    <input className={inputClass} type="date" name="cancelledAt" defaultValue={toInputDate(new Date())} />
                  </Field>
                  <Field label="Note (optional)" className="md:col-span-2">
                    <input className={inputClass} name="cancelNote" placeholder="For example: board cancelled route only" />
                  </Field>
                  <div className="md:col-span-2">
                    <button className="rounded-xl bg-rose-soft px-4 py-2.5 text-sm text-rose" type="submit">
                      Cancel this route only
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ))}

          {cancelled.length ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted">Cancelled routes</p>
              {cancelled.map((route) => (
                <div key={route.id} className="rounded-xl border border-rose/20 bg-rose-soft/30 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link className="text-lg font-medium text-teal hover:underline" href={`/contracts/${contractId}/routes/${route.id}`}>
                        Route {route.number}
                      </Link>
                      <p className="mt-1 text-sm text-rose">
                        Cancelled {formatDate(route.cancelledAt)}
                        {route.cancelNote ? ` · ${route.cancelNote}` : ""}
                      </p>
                      {route.addendaCount ? (
                        <p className="mt-1 text-sm text-muted">
                          {route.addendaCount} addendum{route.addendaCount === 1 ? "" : "s"} still on file
                        </p>
                      ) : null}
                    </div>
                    {canEdit ? (
                      <form action={restoreContractRoute}>
                        <input type="hidden" name="contractId" value={contractId} />
                        <input type="hidden" name="routeId" value={route.id} />
                        <button className="text-sm text-teal hover:underline" type="submit">
                          Mark active again
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <p className="text-sm text-muted">
        {routes.length
          ? `${active.length} active route${active.length === 1 ? "" : "s"}`
          : "No routes yet"}
        {cancelled.length ? ` · ${cancelled.length} cancelled` : ""}
        {addendumTotal ? ` · ${addendumTotal} addendum${addendumTotal === 1 ? "" : "s"} total` : ""}
      </p>
    </div>
  );
}
