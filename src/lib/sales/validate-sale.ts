import { eq } from "drizzle-orm";
import type { getDb } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { priceTierMatches } from "@/lib/employee/sale-math";

export type SaleLineInput = {
  serviceId: string;
  unitPrice: number;
  priceLabel: string | null;
};

export type SaleValidationError = "no_items" | "invalid_service" | "invalid_price";

export async function validateSaleLines(
  db: ReturnType<typeof getDb>,
  items: SaleLineInput[],
): Promise<SaleValidationError | null> {
  if (items.length === 0) {
    return "no_items";
  }

  for (const line of items) {
    const [service] = await db
      .select({
        id: services.id,
        priceTiers: services.priceTiers,
        isActive: services.isActive,
      })
      .from(services)
      .where(eq(services.id, line.serviceId))
      .limit(1);

    if (!service?.isActive) {
      return "invalid_service";
    }

    const tiers = service.priceTiers ?? [];
    if (!priceTierMatches(tiers, line.unitPrice, line.priceLabel)) {
      return "invalid_price";
    }
  }

  return null;
}
