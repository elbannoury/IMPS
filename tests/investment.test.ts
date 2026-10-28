import { describe, expect, it } from "vitest";
import { grossAnnualYield, netAnnualYield } from "@/lib/investment";

describe("gross yield", () => {
  it("computes the documented formula", () => {
    const result = grossAnnualYield({ purchasePrice: 2_850_000, monthlyRent: 12_000 });
    expect(result.annualRent).toBe(144_000);
    expect(result.grossYieldPercent).toBeCloseTo(5.1, 1);
  });

  it("never estimates a missing rent", () => {
    const result = grossAnnualYield({ purchasePrice: 2_850_000, monthlyRent: null });
    expect(result.grossYieldPercent).toBeNull();
    expect(result.reason).toBe("missing_rent");
  });

  it("never estimates a missing price", () => {
    const result = grossAnnualYield({ purchasePrice: 0, monthlyRent: 12_000 });
    expect(result.grossYieldPercent).toBeNull();
    expect(result.reason).toBe("missing_price");
  });
});

describe("net yield", () => {
  it("requires operating costs to be recorded", () => {
    expect(netAnnualYield(2_850_000, 144_000, null)).toBeNull();
    expect(netAnnualYield(2_850_000, 144_000, 30_000)).toBeCloseTo(4.0, 1);
  });
});
