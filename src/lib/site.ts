import "server-only";
import { cache } from "react";
import { prisma } from "./db";

export type SiteContact = {
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  mapProvider: string;
  mapToken: string;
};

/** Public contact configuration: DB settings first, env as fallback. */
export const getSiteContact = cache(async (): Promise<SiteContact> => {
  let settings: Record<string, string> = {};
  try {
    const rows = await prisma.siteSetting.findMany();
    settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  } catch {
    settings = {};
  }
  return {
    email: settings["contact.email"] || process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
    phone: settings["contact.phone"] || process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
    address: settings["contact.address"] || "",
    mapProvider: process.env.NEXT_PUBLIC_MAP_PROVIDER || "",
    mapToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
  };
});

export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`;
}
