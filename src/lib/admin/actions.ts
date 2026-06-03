"use server";

import { and, eq, ne } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { normalizePriceTiers, validatePin, validatePriceTiers } from "@/lib/admin/validators";
import { hashPassword, hashPin, verifyPin } from "@/lib/auth/password";
import { getDb } from "@/lib/db";
import {
  branches,
  employees,
  expenses,
  type PriceTier,
  saleItems,
  sales,
  serviceCategories,
  services,
} from "@/lib/db/schema";
import {
  type DiscountPreset,
  discountAmountFromPreset,
  saleTotal,
  subtotalFromItems,
} from "@/lib/employee/sale-math";
import { type SaleLineInput, validateSaleLines } from "@/lib/sales/validate-sale";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ADMIN_ERROR_KEYS = [
  "unauthorized",
  "invalid_name",
  "invalid_branch",
  "invalid_auth",
  "invalid_pin",
  "pin_in_use",
  "invalid_username",
  "username_in_use",
  "invalid_password",
  "invalid_tiers",
  "invalid_category",
  "branch_has_history",
  "no_items",
  "invalid_service",
  "invalid_price",
  "invalid_sale",
  "invalid_expense",
  "invalid_amount",
  "save_failed",
] as const;

const EXPENSE_CATEGORIES = new Set(["supplies", "transport", "other"]);

export type AdminErrorKey = (typeof ADMIN_ERROR_KEYS)[number];

export async function translateAdminError(error: string): Promise<string> {
  const t = await getTranslations("admin.errors");
  if ((ADMIN_ERROR_KEYS as readonly string[]).includes(error)) {
    return t(error as AdminErrorKey);
  }
  return t("save_failed");
}

async function isPinInUse(pin: string, excludeEmployeeId?: string): Promise<boolean> {
  const db = getDb();
  const candidates = await db
    .select({ id: employees.id, pinHash: employees.pinHash })
    .from(employees)
    .where(and(eq(employees.authType, "pin"), eq(employees.isActive, true)));

  for (const employee of candidates) {
    if (excludeEmployeeId && employee.id === excludeEmployeeId) continue;
    if (!employee.pinHash) continue;
    if (await verifyPin(pin, employee.pinHash)) return true;
  }
  return false;
}

// --- Branches ---

export type BranchInput = {
  nameEn: string;
  nameAr: string;
  address: string | null;
  phone: string | null;
};

export async function createBranch(input: BranchInput): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  const nameEn = input.nameEn.trim();
  const nameAr = input.nameAr.trim();
  if (!nameEn || !nameAr) return { ok: false, error: "invalid_name" };

  const db = getDb();
  await db.insert(branches).values({
    nameEn,
    nameAr,
    address: input.address?.trim() || null,
    phone: input.phone?.trim() || null,
    isActive: true,
  });

  return { ok: true };
}

export async function updateBranch(
  branchId: string,
  input: BranchInput & { isActive: boolean },
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  const nameEn = input.nameEn.trim();
  const nameAr = input.nameAr.trim();
  if (!nameEn || !nameAr) return { ok: false, error: "invalid_name" };

  const db = getDb();
  const [existing] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  if (!existing) return { ok: false, error: "invalid_branch" };

  await db
    .update(branches)
    .set({
      nameEn,
      nameAr,
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      isActive: input.isActive,
    })
    .where(eq(branches.id, branchId));

  return { ok: true };
}

// --- Employees ---

export type EmployeeInput = {
  name: string;
  branchId: string;
  authType: "pin" | "password";
  pin?: string;
  username?: string;
  password?: string;
  role: "employee" | "admin";
};

export async function createEmployee(input: EmployeeInput): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "invalid_name" };

  const db = getDb();
  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.id, input.branchId))
    .limit(1);
  if (!branch) return { ok: false, error: "invalid_branch" };

  if (input.authType === "pin") {
    const pin = input.pin?.trim() ?? "";
    if (!validatePin(pin)) return { ok: false, error: "invalid_pin" };
    if (await isPinInUse(pin)) return { ok: false, error: "pin_in_use" };

    const pinHash = await hashPin(pin);
    await db.insert(employees).values({
      name,
      branchId: input.branchId,
      authType: "pin",
      pinHash,
      role: input.role,
      isActive: true,
    });
    return { ok: true };
  }

  const username = input.username?.trim() ?? "";
  const password = input.password ?? "";
  if (!username) return { ok: false, error: "invalid_username" };
  if (password.length < 6) return { ok: false, error: "invalid_password" };

  const [existingUser] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.username, username))
    .limit(1);
  if (existingUser) return { ok: false, error: "username_in_use" };

  const passwordHash = await hashPassword(password);
  await db.insert(employees).values({
    name,
    branchId: input.branchId,
    authType: "password",
    username,
    passwordHash,
    role: input.role,
    isActive: true,
  });

  return { ok: true };
}

export type EmployeeUpdateInput = EmployeeInput & {
  isActive: boolean;
  resetPin?: string;
  resetPassword?: string;
};

export async function updateEmployee(
  employeeId: string,
  input: EmployeeUpdateInput,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "invalid_name" };

  const db = getDb();
  const [existing] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!existing) return { ok: false, error: "invalid_branch" };

  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.id, input.branchId))
    .limit(1);
  if (!branch) return { ok: false, error: "invalid_branch" };

  const updates: Partial<typeof employees.$inferInsert> = {
    name,
    branchId: input.branchId,
    role: input.role,
    isActive: input.isActive,
  };

  if (input.authType === "pin") {
    const pin = input.resetPin?.trim();
    if (pin) {
      if (!validatePin(pin)) return { ok: false, error: "invalid_pin" };
      if (await isPinInUse(pin, employeeId)) return { ok: false, error: "pin_in_use" };
      updates.pinHash = await hashPin(pin);
      updates.authType = "pin";
      updates.username = null;
      updates.passwordHash = null;
    } else if (existing.authType !== "pin") {
      return { ok: false, error: "invalid_auth" };
    }
  } else {
    const username = input.username?.trim() ?? existing.username ?? "";
    if (!username) return { ok: false, error: "invalid_username" };

    if (username !== existing.username) {
      const [taken] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(and(eq(employees.username, username), ne(employees.id, employeeId)))
        .limit(1);
      if (taken) return { ok: false, error: "username_in_use" };
    }

    updates.authType = "password";
    updates.username = username;
    updates.pinHash = null;

    const password = input.resetPassword ?? input.password;
    if (password) {
      if (password.length < 6) return { ok: false, error: "invalid_password" };
      updates.passwordHash = await hashPassword(password);
    } else if (existing.authType !== "password") {
      return { ok: false, error: "invalid_auth" };
    }
  }

  await db.update(employees).set(updates).where(eq(employees.id, employeeId));
  return { ok: true };
}

// --- Services ---

export type ServiceInput = {
  categoryId: string;
  nameEn: string;
  nameAr: string;
  priceTiers: PriceTier[];
  isActive: boolean;
};

export async function createService(input: ServiceInput): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  const nameEn = input.nameEn.trim();
  const nameAr = input.nameAr.trim();
  if (!nameEn || !nameAr) return { ok: false, error: "invalid_name" };

  const tiers = normalizePriceTiers(input.priceTiers);
  if (!validatePriceTiers(tiers)) return { ok: false, error: "invalid_tiers" };

  const db = getDb();
  const [category] = await db
    .select({ id: serviceCategories.id })
    .from(serviceCategories)
    .where(eq(serviceCategories.id, input.categoryId))
    .limit(1);
  if (!category) return { ok: false, error: "invalid_category" };

  await db.insert(services).values({
    categoryId: input.categoryId,
    nameEn,
    nameAr,
    priceTiers: tiers,
    isActive: input.isActive,
  });

  return { ok: true };
}

export async function updateService(serviceId: string, input: ServiceInput): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  const nameEn = input.nameEn.trim();
  const nameAr = input.nameAr.trim();
  if (!nameEn || !nameAr) return { ok: false, error: "invalid_name" };

  const tiers = normalizePriceTiers(input.priceTiers);
  if (!validatePriceTiers(tiers)) return { ok: false, error: "invalid_tiers" };

  const db = getDb();
  const [existing] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
  if (!existing) return { ok: false, error: "invalid_category" };

  const [category] = await db
    .select({ id: serviceCategories.id })
    .from(serviceCategories)
    .where(eq(serviceCategories.id, input.categoryId))
    .limit(1);
  if (!category) return { ok: false, error: "invalid_category" };

  await db
    .update(services)
    .set({
      categoryId: input.categoryId,
      nameEn,
      nameAr,
      priceTiers: tiers,
      isActive: input.isActive,
    })
    .where(eq(services.id, serviceId));

  return { ok: true };
}

// --- Branch / employee deactivate ---

export async function deactivateBranch(branchId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  const db = getDb();
  const [existing] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  if (!existing) return { ok: false, error: "invalid_branch" };

  await db.update(branches).set({ isActive: false }).where(eq(branches.id, branchId));
  return { ok: true };
}

export async function deactivateEmployee(employeeId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  const db = getDb();
  const [existing] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!existing) return { ok: false, error: "invalid_branch" };

  await db.update(employees).set({ isActive: false }).where(eq(employees.id, employeeId));
  return { ok: true };
}

export async function deactivateService(serviceId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  const db = getDb();
  const [existing] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
  if (!existing) return { ok: false, error: "invalid_service" };

  await db.update(services).set({ isActive: false }).where(eq(services.id, serviceId));
  return { ok: true };
}

// --- Sales & expenses ---

export type AdminSaleUpdateInput = {
  customerName: string | null;
  customerPhone: string | null;
  items: SaleLineInput[];
  discountPreset: DiscountPreset;
  customDiscountAmount: number;
};

export async function deleteSale(saleId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  const db = getDb();
  const [existing] = await db
    .select({ id: sales.id })
    .from(sales)
    .where(eq(sales.id, saleId))
    .limit(1);
  if (!existing) return { ok: false, error: "invalid_sale" };

  await db.transaction(async (tx) => {
    await tx.delete(saleItems).where(eq(saleItems.saleId, saleId));
    await tx.delete(sales).where(eq(sales.id, saleId));
  });

  return { ok: true };
}

export async function updateSale(
  saleId: string,
  input: AdminSaleUpdateInput,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  const db = getDb();
  const [existing] = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
  if (!existing) return { ok: false, error: "invalid_sale" };

  const validationError = await validateSaleLines(db, input.items);
  if (validationError) return { ok: false, error: validationError };

  const subtotal = subtotalFromItems(input.items);
  const discountAmount = discountAmountFromPreset(
    subtotal,
    input.discountPreset,
    input.customDiscountAmount,
  );
  const total = saleTotal(subtotal, discountAmount);
  const customerName = input.customerName?.trim() || null;
  const customerPhone = input.customerPhone?.trim() || null;

  await db.transaction(async (tx) => {
    await tx
      .update(sales)
      .set({
        customerName,
        customerPhone,
        discountAmount: discountAmount.toFixed(3),
        total: total.toFixed(3),
      })
      .where(eq(sales.id, saleId));

    await tx.delete(saleItems).where(eq(saleItems.saleId, saleId));
    await tx.insert(saleItems).values(
      input.items.map((line) => ({
        saleId,
        serviceId: line.serviceId,
        unitPrice: line.unitPrice.toFixed(3),
        priceLabel: line.priceLabel,
      })),
    );
  });

  return { ok: true };
}

export type AdminExpenseUpdateInput = {
  amount: number;
  category: string;
  note: string | null;
};

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  const db = getDb();
  const [existing] = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);
  if (!existing) return { ok: false, error: "invalid_expense" };

  await db.delete(expenses).where(eq(expenses.id, expenseId));
  return { ok: true };
}

export async function updateExpense(
  expenseId: string,
  input: AdminExpenseUpdateInput,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };

  if (!EXPENSE_CATEGORIES.has(input.category)) {
    return { ok: false, error: "invalid_category" };
  }
  if (input.amount <= 0) {
    return { ok: false, error: "invalid_amount" };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);
  if (!existing) return { ok: false, error: "invalid_expense" };

  await db
    .update(expenses)
    .set({
      amount: input.amount.toFixed(3),
      category: input.category,
      note: input.note?.trim() || null,
    })
    .where(eq(expenses.id, expenseId));

  return { ok: true };
}
