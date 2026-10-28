"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { href: string; label: string };

export function MobileNav({
  items,
  secondary,
  cta,
  labels,
}: {
  items: Item[];
  secondary: Item[];
  cta: { href: string; label: string };
  labels: { menu: string; close: string };
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.menu}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center border border-line"
      >
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
          <path d="M0 1h18M0 6h18M0 11h18" stroke="#111" strokeWidth="1.4" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex h-[72px] items-center justify-between border-b border-line px-5">
            <span className="font-display text-2xl font-semibold tracking-[-0.06em]">IMPS</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={labels.close}
              className="flex h-10 w-10 items-center justify-center border border-line"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1L1 13" stroke="#111" strokeWidth="1.4" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-5 py-6">
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between border-b border-line py-3.5 font-display text-2xl tracking-tight"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-8 space-y-2">
              {secondary.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={() => setOpen(false)} className="block py-1 text-sm text-muted">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={cta.href} onClick={() => setOpen(false)} className="btn-primary mt-8 w-full">
              {cta.label}
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
