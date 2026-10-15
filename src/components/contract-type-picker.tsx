import Link from "next/link";
import { INTAKE_TYPES } from "@/lib/contract-intake";

export function ContractTypePicker({
  basePath,
  hint,
}: {
  basePath: string;
  hint: string;
}) {
  return (
    <div>
      <p className="mb-4 text-muted">{hint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {INTAKE_TYPES.map((row) => (
          <Link
            key={row.value}
            href={`${basePath}?type=${row.value}`}
            className="rounded-2xl border border-line bg-white px-5 py-4 text-left shadow-sm transition hover:border-teal hover:bg-teal-soft/40"
          >
            <p className="serif text-xl">{row.title}</p>
            <p className="mt-1 text-sm text-muted">{row.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
