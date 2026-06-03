import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { type DateRange, resolveReportDateRange } from "@/lib/admin/date-range";
import { requireAdmin } from "@/lib/admin/require-admin";
import { computeDailyHoursForSessions, sessionOverlapMs } from "@/lib/attendance-utils";
import { getDb } from "@/lib/db";
import {
  attendanceSessions,
  employees,
  expenses,
  saleItems,
  sales,
  services,
} from "@/lib/db/schema";

export type SalesByEmployeeRow = {
  employeeId: string;
  employeeName: string;
  saleCount: number;
  revenueTotal: number;
};

export type ExpenseByCategoryRow = {
  category: string;
  total: number;
  count: number;
};

export type SaleReportItemRow = {
  serviceId: string;
  nameEn: string;
  nameAr: string;
  unitPrice: number;
  priceLabel: string | null;
};

export type SaleReportRow = {
  id: string;
  saleCode: string;
  createdAt: Date;
  customerName: string | null;
  customerPhone: string | null;
  employeeId: string;
  employeeName: string;
  total: number;
  discountAmount: number;
  items: SaleReportItemRow[];
};

export type ExpenseReportRow = {
  id: string;
  createdAt: Date;
  employeeId: string;
  employeeName: string;
  category: string;
  amount: number;
  note: string | null;
};

export type AttendanceSessionReportRow = {
  id: string;
  checkedInAt: Date;
  checkedOutAt: Date | null;
  durationMs: number;
};

export type AttendanceDailyHoursRow = {
  date: string;
  ms: number;
};

export type AttendanceSummaryRow = {
  employeeId: string;
  employeeName: string;
  totalMs: number;
  dailyHours: AttendanceDailyHoursRow[];
  sessions: AttendanceSessionReportRow[];
};

export type ReportData = {
  range: DateRange;
  salesByEmployee: SalesByEmployeeRow[];
  sales: SaleReportRow[];
  revenueTotal: number;
  saleCount: number;
  expensesTotal: number;
  expensesByCategory: ExpenseByCategoryRow[];
  expenses: ExpenseReportRow[];
  attendanceByEmployee: AttendanceSummaryRow[];
};

function buildEmployeeFilter(employeeId: string | null | undefined) {
  return employeeId ? eq(sales.employeeId, employeeId) : undefined;
}

function buildExpenseEmployeeFilter(employeeId: string | null | undefined) {
  return employeeId ? eq(expenses.employeeId, employeeId) : undefined;
}

export async function getReportData(input: {
  branchId: string | null;
  employeeId?: string | null;
  from?: string;
  to?: string;
}): Promise<ReportData | null> {
  if (!(await requireAdmin())) return null;

  const dateRange = resolveReportDateRange(input.from, input.to);
  const db = getDb();
  const now = new Date();
  const windowEnd = dateRange.to.getTime() < now.getTime() ? dateRange.to : now;

  const salesConditions = [
    gte(sales.createdAt, dateRange.from),
    lte(sales.createdAt, dateRange.to),
  ];
  if (input.branchId) {
    salesConditions.push(eq(sales.branchId, input.branchId));
  }
  const employeeSaleFilter = buildEmployeeFilter(input.employeeId);
  if (employeeSaleFilter) {
    salesConditions.push(employeeSaleFilter);
  }

  const salesByEmployee = await db
    .select({
      employeeId: employees.id,
      employeeName: employees.name,
      saleCount: sql<number>`count(${sales.id})::int`,
      revenueTotal: sql<string>`coalesce(sum(${sales.total}), 0)`,
    })
    .from(sales)
    .innerJoin(employees, eq(sales.employeeId, employees.id))
    .where(and(...salesConditions))
    .groupBy(employees.id, employees.name)
    .orderBy(sql`coalesce(sum(${sales.total}), 0) desc`);

  const saleRows = await db
    .select({
      id: sales.id,
      saleCode: sales.saleCode,
      createdAt: sales.createdAt,
      customerName: sales.customerName,
      customerPhone: sales.customerPhone,
      employeeId: sales.employeeId,
      employeeName: employees.name,
      total: sales.total,
      discountAmount: sales.discountAmount,
    })
    .from(sales)
    .innerJoin(employees, eq(sales.employeeId, employees.id))
    .where(and(...salesConditions))
    .orderBy(desc(sales.createdAt));

  const saleIds = saleRows.map((row) => row.id);
  const itemsBySaleId = new Map<string, SaleReportItemRow[]>();

  if (saleIds.length > 0) {
    const itemRows = await db
      .select({
        saleId: saleItems.saleId,
        serviceId: saleItems.serviceId,
        nameEn: services.nameEn,
        nameAr: services.nameAr,
        unitPrice: saleItems.unitPrice,
        priceLabel: saleItems.priceLabel,
      })
      .from(saleItems)
      .innerJoin(services, eq(saleItems.serviceId, services.id))
      .where(inArray(saleItems.saleId, saleIds));

    for (const item of itemRows) {
      const list = itemsBySaleId.get(item.saleId) ?? [];
      list.push({
        serviceId: item.serviceId,
        nameEn: item.nameEn,
        nameAr: item.nameAr,
        unitPrice: Number.parseFloat(item.unitPrice),
        priceLabel: item.priceLabel,
      });
      itemsBySaleId.set(item.saleId, list);
    }
  }

  const [revenueRow] = await db
    .select({
      saleCount: sql<number>`count(*)::int`,
      revenueTotal: sql<string>`coalesce(sum(${sales.total}), 0)`,
    })
    .from(sales)
    .where(and(...salesConditions));

  const expenseConditions = [
    gte(expenses.createdAt, dateRange.from),
    lte(expenses.createdAt, dateRange.to),
  ];
  if (input.branchId) {
    expenseConditions.push(eq(expenses.branchId, input.branchId));
  }
  const employeeExpenseFilter = buildExpenseEmployeeFilter(input.employeeId);
  if (employeeExpenseFilter) {
    expenseConditions.push(employeeExpenseFilter);
  }

  const expensesByCategory = await db
    .select({
      category: expenses.category,
      total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .where(and(...expenseConditions))
    .groupBy(expenses.category)
    .orderBy(sql`coalesce(sum(${expenses.amount}), 0) desc`);

  const expenseRows = await db
    .select({
      id: expenses.id,
      createdAt: expenses.createdAt,
      employeeId: expenses.employeeId,
      employeeName: employees.name,
      category: expenses.category,
      amount: expenses.amount,
      note: expenses.note,
    })
    .from(expenses)
    .innerJoin(employees, eq(expenses.employeeId, employees.id))
    .where(and(...expenseConditions))
    .orderBy(desc(expenses.createdAt));

  const [expenseTotalRow] = await db
    .select({
      expensesTotal: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(and(...expenseConditions));

  const attendanceConditions = [
    lte(attendanceSessions.checkedInAt, dateRange.to),
    or(
      isNull(attendanceSessions.checkedOutAt),
      gte(attendanceSessions.checkedOutAt, dateRange.from),
    ),
  ];
  if (input.branchId) {
    attendanceConditions.push(eq(attendanceSessions.branchId, input.branchId));
  }
  if (input.employeeId) {
    attendanceConditions.push(eq(attendanceSessions.employeeId, input.employeeId));
  }

  const attendanceRows = await db
    .select({
      id: attendanceSessions.id,
      employeeId: attendanceSessions.employeeId,
      employeeName: employees.name,
      checkedInAt: attendanceSessions.checkedInAt,
      checkedOutAt: attendanceSessions.checkedOutAt,
    })
    .from(attendanceSessions)
    .innerJoin(employees, eq(attendanceSessions.employeeId, employees.id))
    .where(and(...attendanceConditions))
    .orderBy(desc(attendanceSessions.checkedInAt));

  const attendanceByEmployeeMap = new Map<string, AttendanceSummaryRow>();
  for (const row of attendanceRows) {
    const durationMs = sessionOverlapMs(
      row.checkedInAt,
      row.checkedOutAt,
      dateRange.from,
      new Date(windowEnd),
    );
    const session: AttendanceSessionReportRow = {
      id: row.id,
      checkedInAt: row.checkedInAt,
      checkedOutAt: row.checkedOutAt,
      durationMs,
    };

    const existing = attendanceByEmployeeMap.get(row.employeeId);
    if (existing) {
      existing.sessions.push(session);
      existing.totalMs += durationMs;
    } else {
      attendanceByEmployeeMap.set(row.employeeId, {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        totalMs: durationMs,
        dailyHours: [],
        sessions: [session],
      });
    }
  }

  const windowEndDate = new Date(windowEnd);
  for (const summary of attendanceByEmployeeMap.values()) {
    summary.dailyHours = computeDailyHoursForSessions(
      summary.sessions,
      dateRange.from,
      windowEndDate,
    );
  }

  const attendanceByEmployee = [...attendanceByEmployeeMap.values()].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName),
  );

  return {
    range: dateRange,
    salesByEmployee: salesByEmployee.map((row) => ({
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      saleCount: row.saleCount,
      revenueTotal: Number.parseFloat(row.revenueTotal) || 0,
    })),
    sales: saleRows.map((row) => ({
      id: row.id,
      saleCode: row.saleCode,
      createdAt: row.createdAt,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      total: Number.parseFloat(row.total),
      discountAmount: Number.parseFloat(row.discountAmount),
      items: itemsBySaleId.get(row.id) ?? [],
    })),
    saleCount: revenueRow?.saleCount ?? 0,
    revenueTotal: Number.parseFloat(revenueRow?.revenueTotal ?? "0") || 0,
    expensesTotal: Number.parseFloat(expenseTotalRow?.expensesTotal ?? "0") || 0,
    expensesByCategory: expensesByCategory.map((row) => ({
      category: row.category,
      total: Number.parseFloat(row.total) || 0,
      count: row.count,
    })),
    expenses: expenseRows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      category: row.category,
      amount: Number.parseFloat(row.amount),
      note: row.note,
    })),
    attendanceByEmployee,
  };
}
