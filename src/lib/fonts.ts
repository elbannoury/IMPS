import { Inter_Tight, Instrument_Serif, Noto_Kufi_Arabic } from "next/font/google";

export const sans = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

export const arabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  variable: "--font-arabic",
});
