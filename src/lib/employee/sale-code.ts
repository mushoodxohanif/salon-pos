import { eq, sql } from "drizzle-orm";
import type { getDb } from "@/lib/db";
import { sales } from "@/lib/db/schema";

export function formatSaleCode(sequence: number): string {
  return `S-${String(sequence).padStart(6, "0")}`;
}

export async function allocateSaleCode(
  db: ReturnType<typeof getDb>,
  branchId: string,
): Promise<string> {
  const [row] = await db
    .select({
      maxNum: sql<number | null>`max(
        case
          when ${sales.saleCode} ~ '^S-[0-9]+$'
          then cast(substring(${sales.saleCode} from 3) as integer)
          else null
        end
      )`.mapWith(Number),
    })
    .from(sales)
    .where(eq(sales.branchId, branchId));

  return formatSaleCode((row?.maxNum ?? 0) + 1);
}
