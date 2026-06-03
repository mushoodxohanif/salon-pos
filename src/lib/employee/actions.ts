"use server";

import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { expenses, saleItems, sales, services } from "@/lib/db/schema";
import { type SaleLineInput, validateSaleLines } from "@/lib/sales/validate-sale";
import { allocateSaleCode } from "./sale-code";
import {
  type DiscountPreset,
  discountAmountFromPreset,
  saleTotal,
  subtotalFromItems,
} from "./sale-math";

export type CreateSaleInput = {
  customerName: string | null;
  customerPhone: string | null;
  items: SaleLineInput[];
  discountPreset: DiscountPreset;
  customDiscountAmount: number;
};

export type CreateSaleResult = { ok: true; saleId: string } | { ok: false; error: string };

export async function createSale(input: CreateSaleInput): Promise<CreateSaleResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "unauthorized" };
  }

  const db = getDb();
  const validationError = await validateSaleLines(db, input.items);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const subtotal = subtotalFromItems(input.items);
  const discountAmount = discountAmountFromPreset(
    subtotal,
    input.discountPreset,
    input.customDiscountAmount,
  );
  const total = saleTotal(subtotal, discountAmount);

  const customerName = input.customerName?.trim() || null;
  const customerPhone = input.customerPhone?.trim() || null;
  const saleCode = await allocateSaleCode(db, session.branchId);

  const [sale] = await db
    .insert(sales)
    .values({
      branchId: session.branchId,
      employeeId: session.employeeId,
      saleCode,
      customerName,
      customerPhone,
      discountAmount: discountAmount.toFixed(3),
      total: total.toFixed(3),
      currency: "OMR",
    })
    .returning({ id: sales.id });

  await db.insert(saleItems).values(
    input.items.map((line) => ({
      saleId: sale.id,
      serviceId: line.serviceId,
      unitPrice: line.unitPrice.toFixed(3),
      priceLabel: line.priceLabel,
    })),
  );

  return { ok: true, saleId: sale.id };
}

export type CreateExpenseInput = {
  amount: number;
  category: string;
  note: string | null;
};

export type CreateExpenseResult = { ok: true; expenseId: string } | { ok: false; error: string };

const EXPENSE_CATEGORIES = new Set(["supplies", "transport", "other"]);

export async function createExpense(input: CreateExpenseInput): Promise<CreateExpenseResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "unauthorized" };
  }

  if (!EXPENSE_CATEGORIES.has(input.category)) {
    return { ok: false, error: "invalid_category" };
  }

  if (input.amount <= 0) {
    return { ok: false, error: "invalid_amount" };
  }

  const db = getDb();
  const [expense] = await db
    .insert(expenses)
    .values({
      branchId: session.branchId,
      employeeId: session.employeeId,
      amount: input.amount.toFixed(3),
      category: input.category,
      note: input.note?.trim() || null,
    })
    .returning({ id: expenses.id });

  return { ok: true, expenseId: expense.id };
}

export async function getSaleReceipt(saleId: string) {
  const session = await getSession();
  if (!session) return null;

  const db = getDb();
  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.employeeId, session.employeeId)))
    .limit(1);

  if (!sale) return null;

  const items = await db
    .select({
      unitPrice: saleItems.unitPrice,
      priceLabel: saleItems.priceLabel,
      nameEn: services.nameEn,
      nameAr: services.nameAr,
    })
    .from(saleItems)
    .innerJoin(services, eq(saleItems.serviceId, services.id))
    .where(eq(saleItems.saleId, saleId));

  return {
    id: sale.id,
    saleCode: sale.saleCode,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    discountAmount: Number.parseFloat(sale.discountAmount),
    total: Number.parseFloat(sale.total),
    createdAt: sale.createdAt,
    items: items.map((item) => ({
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      unitPrice: Number.parseFloat(item.unitPrice),
      priceLabel: item.priceLabel,
    })),
  };
}

const ACTION_ERROR_KEYS = [
  "unauthorized",
  "no_items",
  "invalid_service",
  "invalid_price",
  "invalid_category",
  "invalid_amount",
  "already_checked_in",
  "not_checked_in",
  "save_failed",
] as const;

export type ActionErrorKey = (typeof ACTION_ERROR_KEYS)[number];

export async function translateActionError(error: string): Promise<string> {
  const t = await getTranslations("employee.errors");
  if ((ACTION_ERROR_KEYS as readonly string[]).includes(error)) {
    return t(error as ActionErrorKey);
  }
  return t("save_failed");
}
