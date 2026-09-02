import Link from "next/link";
import { cn } from "@/lib/utils";
import { statusChipStyle } from "@/lib/status-color";
import { BackLink } from "./nav-controls";

export function StatusChip({ name, color }: { name: string; color?: string }) {
  return (
    <span className="inline-flex rounded-full px-2.5 py-1 text-sm font-medium" style={statusChipStyle(color)}>
      {name}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-card p-6 shadow-[0_1px_0_rgba(44,58,71,0.04),0_12px_32px_rgba(44,58,71,0.06)]", className)}>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  hint,
  actions,
  backHref,
}: {
  title: string;
  hint?: string;
  actions?: React.ReactNode;
  backHref?: string;
}) {
  return (
    <div className="mb-6">
      <BackLink href={backHref} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="serif text-3xl text-ink">{title}</h1>
          {hint ? <p className="mt-1 max-w-2xl text-muted">{hint}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  type = "button",
  className,
}: {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = {
    primary: "btn-primary",
    secondary: "btn-secondary border border-line",
    danger: "btn-danger",
    ghost: "bg-transparent text-teal hover:bg-teal-soft",
  }[variant];
  const cls = cn("inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-[15px] font-medium transition", styles, className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} className={cls}>{children}</button>;
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  name?: string;
  hint?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink shadow-sm placeholder:text-muted/70";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="text-center">
      <h2 className="serif text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

export function Flag({ children, tone = "amber" }: { children: React.ReactNode; tone?: string }) {
  return (
    <div className={cn("rounded-xl px-4 py-3 text-sm", `chip-${tone}`)}>
      {children}
    </div>
  );
}
