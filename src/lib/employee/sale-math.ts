export type DiscountPreset = "none" | "percent5" | "percent10" | "custom";

export function subtotalFromItems(items: { unitPrice: number }[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice, 0);
}

export function discountAmountFromPreset(
  subtotal: number,
  preset: DiscountPreset,
  customAmount: number,
): number {
  if (subtotal <= 0) return 0;
  switch (preset) {
    case "percent5":
      return roundOmr(subtotal * 0.05);
    case "percent10":
      return roundOmr(subtotal * 0.1);
    case "custom":
      return Math.min(roundOmr(customAmount), subtotal);
    default:
      return 0;
  }
}

export function saleTotal(subtotal: number, discountAmount: number): number {
  return Math.max(0, roundOmr(subtotal - discountAmount));
}

function roundOmr(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function inferDiscountPreset(
  subtotal: number,
  discountAmount: number,
): { preset: DiscountPreset; customAmount: number } {
  if (discountAmount <= 0) return { preset: "none", customAmount: 0 };
  const pct5 = discountAmountFromPreset(subtotal, "percent5", 0);
  const pct10 = discountAmountFromPreset(subtotal, "percent10", 0);
  if (Math.abs(discountAmount - pct5) < 0.001) {
    return { preset: "percent5", customAmount: 0 };
  }
  if (Math.abs(discountAmount - pct10) < 0.001) {
    return { preset: "percent10", customAmount: 0 };
  }
  return { preset: "custom", customAmount: discountAmount };
}

export function priceTierMatches(
  tiers: { label: string; amount: number }[],
  unitPrice: number,
  priceLabel: string | null,
): boolean {
  return tiers.some(
    (tier) =>
      Math.abs(tier.amount - unitPrice) < 0.0005 &&
      (priceLabel === null || tier.label === priceLabel),
  );
}
