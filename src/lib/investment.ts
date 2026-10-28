/**
 * Investment metrics derived only from data the team actually recorded.
 * Nothing here estimates a market average or a future return.
 */
export type YieldInput = {
  purchasePrice: number | null | undefined;
  monthlyRent: number | null | undefined;
};

export type YieldResult = {
  grossYieldPercent: number | null;
  annualRent: number | null;
  reason: "ok" | "missing_price" | "missing_rent";
};

export function grossAnnualYield({ purchasePrice, monthlyRent }: YieldInput): YieldResult {
  const annualRent = monthlyRent && monthlyRent > 0 ? monthlyRent * 12 : null;
  if (!purchasePrice || purchasePrice <= 0) {
    return { grossYieldPercent: null, annualRent, reason: "missing_price" };
  }
  if (!annualRent) {
    return { grossYieldPercent: null, annualRent: null, reason: "missing_rent" };
  }
  return {
    grossYieldPercent: Math.round((annualRent / purchasePrice) * 1000) / 10,
    annualRent,
    reason: "ok",
  };
}

/** Annual operating costs are used only when recorded; never estimated. */
export function netAnnualYield(
  purchasePrice: number | null | undefined,
  annualRent: number | null | undefined,
  annualCosts: number | null | undefined,
): number | null {
  if (!purchasePrice || purchasePrice <= 0 || !annualRent) return null;
  if (annualCosts === null || annualCosts === undefined) return null;
  return Math.round(((annualRent - annualCosts) / purchasePrice) * 1000) / 10;
}
