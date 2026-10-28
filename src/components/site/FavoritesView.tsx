"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getFavorites, onChange } from "@/lib/local-store";

type Item = {
  id: string;
  reference: string;
  slug: string;
  titleFr: string;
  titleAr: string | null;
  transactionType: string;
  primaryPrice: number | null;
  primaryRentPeriod: string | null;
  status: string;
  city: { nameFr: string; nameAr: string };
  neighborhood: { nameFr: string; nameAr: string } | null;
  media: { url: string }[];
};

export function FavoritesView({ locale, labels }: { locale: string; labels: Record<string, string> }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const ids = getFavorites();
    if (!ids.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/properties?ids=${ids.join(",")}`);
      const data = (await response.json()) as { items: Item[] };
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return onChange(() => load());
  }, [load]);

  if (loading) return <p className="py-10 text-sm text-muted">{labels.loading}</p>;

  if (!items.length) {
    return (
      <div className="border border-dashed border-line py-16 text-center">
        <p className="font-display text-2xl">{labels.empty}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{labels.hint}</p>
        <Link href={`/${locale}/properties`} className="btn-outline mt-6">
          {labels.browse}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const name = locale === "ar" ? item.city.nameAr : item.city.nameFr;
        const title = (locale === "ar" ? item.titleAr : item.titleFr) || item.titleFr;
        const price = item.primaryPrice
          ? `${new Intl.NumberFormat(locale === "ar" ? "ar-MA-u-nu-latn" : "fr-MA").format(item.primaryPrice)} ${locale === "ar" ? "د.م." : "DH"}`
          : "—";
        return (
          <article key={item.id}>
            <Link href={`/${locale}/properties/${item.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-soft">
              {item.media[0] ? <Image src={item.media[0].url} alt={title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" /> : null}
            </Link>
            <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-muted">{name}</p>
            <h3 className="mt-1 font-display text-lg">
              <Link href={`/${locale}/properties/${item.slug}`}>{title}</Link>
            </h3>
            <p className="mt-2 border-t border-line pt-2 text-sm font-semibold tabular-nums">
              {price}
              {item.transactionType === "rent" ? <span className="text-xs font-normal text-muted">{locale === "ar" ? "/شهر" : "/mois"}</span> : null}
            </p>
          </article>
        );
      })}
    </div>
  );
}
