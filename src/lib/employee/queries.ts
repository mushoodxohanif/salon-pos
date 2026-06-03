import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sales } from "@/lib/db/schema";

export type EmployeeSaleRow = {
  id: string;
  saleCode: string;
  customerName: string | null;
  total: number;
  createdAt: Date;
};

export async function listEmployeeSales(
  employeeId: string,
  limit = 50,
): Promise<EmployeeSaleRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: sales.id,
      saleCode: sales.saleCode,
      customerName: sales.customerName,
      total: sales.total,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .where(eq(sales.employeeId, employeeId))
    .orderBy(desc(sales.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    total: Number.parseFloat(row.total),
  }));
}
