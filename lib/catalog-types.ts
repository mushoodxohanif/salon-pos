export type PriceTier = {
  label: string;
  amount: number;
};

export type CatalogService = {
  name_en: string;
  name_ar: string;
  price_tiers: PriceTier[];
  is_active?: boolean;
};

export type CatalogCategory = {
  name_en: string;
  name_ar: string;
  sort_order: number;
  services: CatalogService[];
};

export type ServicesCatalog = {
  categories: CatalogCategory[];
};

export function roundOMR(amount: number): number {
  return Math.round(amount * 1000) / 1000;
}

const TIER_LABELS = ["Short", "Medium", "Long", "Extra", "Premium"] as const;

/**
 * Parse flyer price strings into OMR price tiers.
 * Handles: `10`, `3/6`, `10/15/20`, `20/25+50`, `3+`, `-` (unavailable).
 */
export function parsePriceString(raw: string): { tiers: PriceTier[]; isActive: boolean } {
  const price = raw.trim();
  if (!price || price === "-" || price === "—") {
    return { tiers: [], isActive: false };
  }

  if (/^\d+(?:\.\d+)?\+$/.test(price)) {
    const base = Number.parseFloat(price.slice(0, -1));
    return {
      tiers: [{ label: "From", amount: roundOMR(base) }],
      isActive: true,
    };
  }

  const parts = price.split("/");
  const tiers: PriceTier[] = [];

  for (const part of parts) {
    const composite = part.match(/^(\d+(?:\.\d+)?)\+(\d+(?:\.\d+)?)$/);
    if (composite) {
      const base = Number.parseFloat(composite[1]);
      const addon = Number.parseFloat(composite[2]);
      const baseLabel = TIER_LABELS[tiers.length] ?? `Tier ${tiers.length + 1}`;
      tiers.push({ label: baseLabel, amount: roundOMR(base) });
      tiers.push({
        label: `${baseLabel} (+${addon})`,
        amount: roundOMR(base + addon),
      });
      continue;
    }

    const simple = part.match(/^(\d+(?:\.\d+)?)$/);
    if (simple) {
      tiers.push({
        label: TIER_LABELS[tiers.length] ?? `Tier ${tiers.length + 1}`,
        amount: roundOMR(Number.parseFloat(simple[1])),
      });
    }
  }

  if (tiers.length === 1) {
    tiers[0].label = "Standard";
  } else if (tiers.length === 2 && !price.includes("+")) {
    tiers[0].label = "Half";
    tiers[1].label = "Full";
  } else if (tiers.length === 3 && !price.includes("+")) {
    tiers[0].label = "Short";
    tiers[1].label = "Medium";
    tiers[2].label = "Long";
  } else if (tiers.length === 4 && !price.includes("+")) {
    tiers[0].label = "Short";
    tiers[1].label = "Medium";
    tiers[2].label = "Long";
    tiers[3].label = "Extra";
  }

  return { tiers, isActive: tiers.length > 0 };
}
