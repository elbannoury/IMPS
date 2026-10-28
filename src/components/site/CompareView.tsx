"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { clearCompare, getCompare, onChange, toggleCompare } from "@/lib/local-store";

type Item = {
  id: string;
  reference: string;
  slug: string;
  titleFr: string;
  titleAr: string | null;
  transactionType: string;
  primaryPrice: number | null;
  primaryRentPeriod: string | null;
  builtArea: number | null;
  landArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  city: { nameFr: string; nameAr: string };
  neighborhood: { nameFr: string; nameAr: string } | null;
  category: { nameFr: string; nameAr: string };
  verificationLevel: string;
  media: { url: string }[];
};

export function CompareView({ locale, labels }: { locale: string; labels: Record<string, string> }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [ids, setIds] = useState<string[]>([]);

  const load = useCallback(async (list: string[]) => {
    setIds(list);
    if (!list.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/properties?ids=${list.join(",")}`);
      const data = (await response.json()) as { items: Item[] };
      const order = new Map(list.map((id, i) => [id, i]));
      setItems([...data.items].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(getCompare());
    return onChange(() => load(getCompare()));
  }, [load]);

  if (loading) return <p className="py-10 text-sm text-muted">{labels.loading}</p>;

  if (!items.length) {
    return (
      <div className="border border-dashed border-line py-16 text-center">
        <p className="font-display text-2xl">{labels.empty}</p>
        <Link href={`/${locale}/properties`} className="btn-outline mt-6">
          {labels.browse}
        </Link>
      </div>
    );
  }

  const name = (row: { nameFr: string; nameAr: string }) => (locale === "ar" ? row.nameAr : row.nameFr);
  const price = (item: Item) =>
    item.primaryPrice
      ? `${new Intl.NumberFormat(locale === "ar" ? "ar-MA-u-nu-latn" : "fr-MA").format(item.primaryPrice)} ${locale === "ar" ? "د.م." : "DH"}${item.transactionType === "rent" ? (locale === "ar" ? "/شهر" : "/mois") : ""}`
      : "—";

  const rows: { label: string; render: (item: Item) => string }[] = [
    { label: labels.price, render: price },
    { label: labels.transaction, render: (i) => (i.transactionType === "rent" ? labels.rent : labels.buy) },
    { label: labels.type, render: (i) => name(i.category) },
    { label: labels.city, render: (i) => `${name(i.city)}${i.neighborhood ? ` · ${name(i.neighborhood)}` : ""}` },
    { label: labels.area, render: (i) => (i.builtArea ? `${i.builtArea} m²` : i.landArea ? `${i.landArea} m²` : "—") },
    { label: labels.bedrooms, render: (i) => (i.bedrooms ? String(i.bedrooms) : "—") },
    { label: labels.bathrooms, render: (i) => (i.bathrooms ? String(i.bathrooms) : "—") },
    { label: labels.verified, render: (i) => (i.verificationLevel === "unverified" ? labels.no : labels.yes) },
    { label: labels.reference, render: (i) => i.reference },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            clearCompare();
            setItems([]);
            setIds([]);
          }}
          className="btn-ghost btn-sm"
        >
          {labels.clear}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-40 border-b border-line p-3 text-start text-[10px] uppercase tracking-[0.14em] text-muted">{labels.field}</th>
              {items.map((item) => (
                <th key={item.id} className="border-b border-line p-3 text-start align-top">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-soft">
                    {item.media[0] ? <Image src={item.media[0].url} alt="" fill sizes="240px" className="object-cover" /> : null}
                  </div>
                  <Link href={`/${locale}/properties/${item.slug}`} className="mt-2 block font-display text-base leading-snug hover:underline">
                    {locale === "ar" ? item.titleAr || item.titleFr : item.titleFr}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      toggleCompare(item.id);
                      load(getCompare());
                    }}
                    className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted underline underline-offset-2 hover:text-ink"
                  >
                    {labels.remove}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="border-b border-line p-3 text-start text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {row.label}
                </th>
                {items.map((item) => (
                  <td key={item.id} className="border-b border-line p-3 align-top tabular-nums">
                    {row.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[11px] text-muted">{labels.disclaimer}</p>
      <p className="mt-1 text-[11px] text-muted">{ids.length} / 4</p>
    </div>
  );
}
