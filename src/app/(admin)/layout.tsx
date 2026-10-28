import "@/app/globals.css";
import { arabic, display, sans } from "@/lib/fonts";

export const metadata = {
  title: "IMPS — Administration",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" className={`${sans.variable} ${display.variable} ${arabic.variable}`}>
      <body className="bg-soft">{children}</body>
    </html>
  );
}
