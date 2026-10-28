import Link from "next/link";
import type { ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h2 className="h-section">{title}</h2>
        {subtitle ? <p className="mt-3 text-sm leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-line px-6 py-16 text-center">
      <p className="font-display text-2xl tracking-tight">{title}</p>
      {hint ? <p className="mx-auto mt-2 max-w-md text-sm text-muted">{hint}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  buildHref,
  labels,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  labels: { previous: string; next: string; page: string; of: string };
}) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let i = start; i < start + 5 && i <= totalPages; i++) pages.push(i);
  return (
    <nav className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6" aria-label="Pagination">
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className="btn-outline btn-sm">
            {labels.previous}
          </Link>
        ) : (
          <span className="btn-outline btn-sm pointer-events-none opacity-40">{labels.previous}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {pages.map((p) => (
          <Link
            key={p}
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center border px-2 text-xs tabular-nums transition-colors",
              p === page ? "border-ink bg-ink text-white" : "border-line hover:border-ink",
            )}
          >
            {p}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">
          {labels.page} {page} {labels.of} {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={buildHref(page + 1)} className="btn-outline btn-sm">
            {labels.next}
          </Link>
        ) : (
          <span className="btn-outline btn-sm pointer-events-none opacity-40">{labels.next}</span>
        )}
      </div>
    </nav>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="border border-line bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums leading-none">{value}</p>
      {hint ? <p className="mt-1.5 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function Notice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "lemon";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "border-line bg-soft text-ink",
    success: "border-ink/15 bg-soft text-ink",
    warning: "border-ink/20 bg-lemon/25 text-ink",
    danger: "border-ink bg-ink text-white",
    lemon: "border-lemon bg-lemon text-ink",
  };
  return <div className={cn("border px-4 py-3 text-xs leading-relaxed", tones[tone])}>{children}</div>;
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  const map: Record<string, string> = {
    published: "border-ink bg-ink text-white",
    in_review: "border-lemon bg-lemon text-ink",
    draft: "border-line bg-soft text-muted",
    reserved: "border-ink/30 bg-white text-ink",
    sold: "border-line bg-soft text-muted line-through decoration-1",
    rented: "border-line bg-soft text-muted",
    unavailable: "border-line bg-soft text-muted",
    expired: "border-line bg-soft text-muted",
    archived: "border-line bg-soft text-muted",
    rejected: "border-ink/20 bg-white text-ink",
  };
  return <span className={cn("badge", map[status] ?? "badge-muted")}>{label}</span>;
}
