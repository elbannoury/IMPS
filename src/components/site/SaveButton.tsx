"use client";

import { useEffect, useState } from "react";
import { isFavorite, onChange, toggleFavorite } from "@/lib/local-store";
import { toggleFavoriteAction } from "@/app/actions/favorites";
import { cn } from "@/components/ui";

export function SaveButton({
  propertyId,
  authenticated,
  labels,
  variant = "icon",
}: {
  propertyId: string;
  authenticated: boolean;
  labels: { save: string; saved: string };
  variant?: "icon" | "button";
}) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSaved(isFavorite(propertyId));
    return onChange(() => setSaved(isFavorite(propertyId)));
  }, [propertyId]);

  async function onClick() {
    setBusy(true);
    const next = toggleFavorite(propertyId);
    setSaved(next);
    if (authenticated) {
      try {
        await toggleFavoriteAction(propertyId);
      } catch {
        /* local state remains authoritative for guests */
      }
    }
    setBusy(false);
  }

  if (variant === "button") {
    return (
      <button type="button" onClick={onClick} disabled={busy} aria-pressed={saved} className={cn("btn-outline", saved && "border-ink bg-lemon/30")}>
        <svg width="15" height="14" viewBox="0 0 18 17" fill={saved ? "currentColor" : "none"} aria-hidden="true">
          <path d="M9 15.5S1.5 11 1.5 5.9A3.9 3.9 0 019 3.4a3.9 3.9 0 017.5 2.5c0 5.1-7.5 9.6-7.5 9.6z" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        {saved ? labels.saved : labels.save}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? labels.saved : labels.save}
      className={cn(
        "flex h-9 w-9 items-center justify-center border border-white/40 bg-white/85 backdrop-blur transition-colors hover:bg-white",
        saved && "border-lemon bg-lemon",
      )}
    >
      <svg width="14" height="13" viewBox="0 0 18 17" fill={saved ? "#111111" : "none"} aria-hidden="true">
        <path d="M9 15.5S1.5 11 1.5 5.9A3.9 3.9 0 019 3.4a3.9 3.9 0 017.5 2.5c0 5.1-7.5 9.6-7.5 9.6z" stroke="#111111" strokeWidth="1.4" />
      </svg>
    </button>
  );
}
