"use client";

import { useEffect, useState } from "react";
import { getCompare, onChange, toggleCompare } from "@/lib/local-store";
import { SaveButton } from "./SaveButton";
import { cn } from "@/components/ui";

export function PropertyActions({
  propertyId,
  authenticated,
  labels,
}: {
  propertyId: string;
  authenticated: boolean;
  labels: {
    save: string;
    saved: string;
    compare: string;
    share: string;
    copied: string;
    full: string;
  };
}) {
  const [inCompare, setInCompare] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setInCompare(getCompare().includes(propertyId));
    sync();
    return onChange(sync);
  }, [propertyId]);

  async function share() {
    const url = window.location.href.split("?")[0]!;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage(labels.copied);
      window.setTimeout(() => setMessage(null), 2400);
    } catch {
      setMessage(labels.copied);
      window.setTimeout(() => setMessage(null), 2400);
    }
  }

  return (
    <div className="space-y-2">
      <SaveButton propertyId={propertyId} authenticated={authenticated} labels={{ save: labels.save, saved: labels.saved }} variant="button" />
      <button
        type="button"
        onClick={() => {
          const result = toggleCompare(propertyId);
          setInCompare(!result.added ? false : true);
          if (result.full) {
            setMessage(labels.full);
            window.setTimeout(() => setMessage(null), 2600);
          }
        }}
        className={cn("btn-outline w-full", inCompare && "border-ink bg-lemon/30")}
        aria-pressed={inCompare}
      >
        {labels.compare}
      </button>
      <button type="button" onClick={share} className="btn-outline w-full">
        {labels.share}
      </button>
      {message ? <p className="text-center text-[11px] text-muted">{message}</p> : null}
    </div>
  );
}
