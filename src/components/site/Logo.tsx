import Link from "next/link";
import { cn } from "@/components/ui";

export function Logo({ href, tone = "dark", compact = false }: { href: string; tone?: "dark" | "light"; compact?: boolean }) {
  const ink = tone === "light" ? "text-white" : "text-ink";
  return (
    <Link href={href} aria-label="IMPS" className="group inline-flex items-baseline gap-1.5">
      <span
        className={cn("font-display font-semibold leading-none", compact ? "text-[22px]" : "text-[26px]", ink)}
        style={{ letterSpacing: "-0.06em" }}
      >
        IMPS
      </span>
      <span className="mb-[3px] inline-block h-2 w-2 bg-lemon transition-transform group-hover:rotate-45" aria-hidden="true" />
    </Link>
  );
}
