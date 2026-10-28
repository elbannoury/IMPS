import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@/app/globals.css";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { arabic, display, sans } from "@/lib/fonts";
import { LOCALES, dirOf, isLocale } from "@/lib/i18n";

// Public content is data-driven and changes when staff publish or update a
// listing. Rendering on demand keeps published pages and search results exact;
// production can add ISR with a cookie-free header (see DEPLOYMENT.md).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "IMPS — Immobilier vérifié au Maroc",
    template: "%s · IMPS",
  },
  description:
    "IMPS sélectionne, vérifie et publie des biens immobiliers au Maroc : appartements, villas, riads, commerces et terrains.",
  alternates: { canonical: "/fr", languages: { fr: "/fr", ar: "/ar" } },
  openGraph: { siteName: "IMPS", type: "website", locale: "fr_MA" },
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} dir={dirOf(locale)} className={`${sans.variable} ${display.variable} ${arabic.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[70] focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          {locale === "ar" ? "تجاوز إلى المحتوى" : "Aller au contenu"}
        </a>
        <Header locale={locale} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
