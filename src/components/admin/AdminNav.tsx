"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

export type NavItem = { href: string; label: string; group: string; badge?: number };

export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() || "/admin";
  const groups = Array.from(new Set(items.map((item) => item.group)));

  return (
    <nav aria-label="Administration" className="space-y-6">
      {groups.map((group) => (
        <div key={group}>
          <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">{group}</p>
          <ul className="space-y-0.5">
            {items
              .filter((item) => item.group === group)
              .map((item) => {
                const active =
                  item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between gap-2 border-s-2 px-3 py-2 text-[12.5px] transition-colors",
                        active
                          ? "border-lemon bg-white/10 text-white"
                          : "border-transparent text-white/65 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <span>{item.label}</span>
                      {item.badge ? (
                        <span className="min-w-5 rounded-full bg-lemon px-1.5 py-0.5 text-center text-[9px] font-bold text-ink tabular-nums">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
