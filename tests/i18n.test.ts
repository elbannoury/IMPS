import { describe, expect, it } from "vitest";
import { dictionaryKeys, getT, LOCALES } from "@/lib/i18n";

describe("localisation", () => {
  it("has French and Arabic dictionaries", () => {
    expect(LOCALES).toContain("fr");
    expect(LOCALES).toContain("ar");
  });

  it("covers every French key in Arabic", () => {
    const fr = dictionaryKeys("fr");
    const ar = new Set(dictionaryKeys("ar"));
    const missing = fr.filter((key) => !ar.has(key));
    expect(missing).toEqual([]);
  });

  it("interpolates variables", () => {
    expect(getT("fr")("common.results", { n: 12 })).toContain("12");
    expect(getT("ar")("common.results", { n: 7 })).toContain("7");
  });

  it("falls back to the key when missing", () => {
    expect(getT("fr")("unknown.key")).toBe("unknown.key");
  });
});
