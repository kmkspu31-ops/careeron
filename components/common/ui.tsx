import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">{eyebrow}</p>}
        <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  href,
  action = "전체 보기",
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div><h3 className="text-base font-bold">{title}</h3>{description && <p className="mt-1 text-xs text-muted">{description}</p>}</div>
      {href && <Link href={href} className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300">{action} →</Link>}
    </div>
  );
}

export function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`app-surface rounded-2xl ${className}`}>{children}</section>;
}

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "violet";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    green: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  };
  return (
    <Surface className="p-5">
      <div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span></div>
      <p className="mt-3 text-xs text-muted">{detail}</p>
    </Surface>
  );
}

export function Tag({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "blue" | "green" | "amber" | "violet" }) {
  const tones = {
    gray: "bg-[var(--surface-subtle)] text-muted",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    green: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-dashed border-[var(--border)] px-6 py-12 text-center"><p className="font-semibold">{title}</p><p className="mt-2 text-sm text-muted">{description}</p></div>;
}

export function ButtonLink({ href, children, secondary = false }: { href: string; children: React.ReactNode; secondary?: boolean }) {
  return <Link href={href} className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition ${secondary ? "border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]" : "bg-blue-600 text-white hover:bg-blue-700"}`}>{children}</Link>;
}
