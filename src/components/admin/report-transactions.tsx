"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { AdminExpenseEditDrawer } from "@/components/admin/admin-expense-edit-drawer";
import { AdminSaleEditDrawer } from "@/components/admin/admin-sale-edit-drawer";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { SaleCodeCopy } from "@/components/employee/sale-code-copy";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/intl/navigation";
import type { Locale } from "@/intl/routing";
import { deleteExpense, deleteSale, translateAdminError } from "@/lib/admin/actions";
import { REPORT_TIMEZONE } from "@/lib/admin/date-range";
import type { AdminService, AdminServiceCategory } from "@/lib/admin/queries";
import type { AttendanceSummaryRow, ExpenseReportRow, SaleReportRow } from "@/lib/admin/reports";
import { formatWorkedDuration } from "@/lib/attendance-utils";
import { formatOMR } from "@/lib/currency";

type ReportTransactionsProps = {
  locale: Locale;
  sales: SaleReportRow[];
  expenses: ExpenseReportRow[];
  attendanceByEmployee: AttendanceSummaryRow[];
  categories: AdminServiceCategory[];
  servicesByCategory: Record<string, AdminService[]>;
  tab: "sales" | "expenses" | "attendance";
};

function formatReportDateTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-OM" : "en-OM", {
    timeZone: REPORT_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMuscatDayLabel(dateKey: string, locale: Locale): string {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T12:00:00+04:00`);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-OM" : "en-OM", {
    timeZone: REPORT_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function ReportSalesList({
  locale,
  sales,
  categories,
  servicesByCategory,
}: Omit<ReportTransactionsProps, "tab" | "expenses" | "attendanceByEmployee">) {
  const t = useTranslations("admin.reports");
  const router = useRouter();
  const [editSale, setEditSale] = useState<SaleReportRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SaleReportRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sales.length === 0) {
    return <p className="py-8 text-center text-sm text-salon-muted">{t("noData")}</p>;
  }

  return (
    <>
      <Accordion type="single" collapsible className="flex flex-col gap-2">
        {sales.map((sale) => (
          <AccordionItem
            key={sale.id}
            value={sale.id}
            className="overflow-hidden rounded-xl border border-salon-border bg-white last:border-b"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-start">
                <span className="flex w-full items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-salon-black" dir="ltr">
                    {sale.saleCode}
                  </span>
                  <span className="text-xs text-salon-muted">
                    {formatReportDateTime(sale.createdAt, locale)}
                  </span>
                </span>
                <span className="text-xs text-salon-muted truncate w-full">
                  {sale.customerName ?? t("walkIn")}
                </span>
              </span>
              <span className="shrink-0 ps-3 font-semibold text-salon-gold">
                {formatOMR(sale.total, locale)}
              </span>
            </AccordionTrigger>
            <AccordionContent className="border-t border-salon-border px-4 pb-4 pt-3">
              <div className="mb-3">
                <SaleCodeCopy saleCode={sale.saleCode} compact />
              </div>
              <dl className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-salon-muted">{t("employee")}</dt>
                  <dd className="font-medium text-salon-black">{sale.employeeName}</dd>
                </div>
                {sale.customerPhone ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-salon-muted">{t("customerPhone")}</dt>
                    <dd className="font-medium text-salon-black" dir="ltr">
                      {sale.customerPhone}
                    </dd>
                  </div>
                ) : null}
                {sale.discountAmount > 0 ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-salon-muted">{t("discount")}</dt>
                    <dd className="font-medium text-salon-black">
                      {formatOMR(sale.discountAmount, locale)}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <ul className="mt-3 flex flex-col gap-2 border-t border-salon-border/60 pt-3">
                {sale.items.map((item) => (
                  <li
                    key={`${item.serviceId}-${item.priceLabel}-${item.unitPrice}`}
                    className="flex justify-between gap-2 text-sm"
                  >
                    <span>
                      {locale === "ar" ? item.nameAr : item.nameEn}
                      {item.priceLabel ? (
                        <span className="text-salon-muted"> · {item.priceLabel}</span>
                      ) : null}
                    </span>
                    <span className="font-semibold shrink-0">
                      {formatOMR(item.unitPrice, locale)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditSale(sale)}
                >
                  {t("edit")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDeleteTarget(sale)}
                >
                  {t("delete")}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <AdminSaleEditDrawer
        sale={editSale}
        open={editSale != null}
        onClose={() => setEditSale(null)}
        locale={locale}
        categories={categories}
        servicesByCategory={servicesByCategory}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title={t("deleteSaleTitle")}
        description={t("deleteSaleDescription", { code: deleteTarget?.saleCode ?? "" })}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("cancel")}
        pending={pending}
        onClose={() => {
          setDeleteTarget(null);
          setError(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteSale(deleteTarget.id);
            if (!result.ok) {
              setError(await translateAdminError(result.error));
              return;
            }
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />

      {error ? (
        <p className="mt-2 text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

export function ReportExpensesList({
  locale,
  expenses,
}: Pick<ReportTransactionsProps, "locale" | "expenses">) {
  const t = useTranslations("admin.reports");
  const router = useRouter();
  const [editExpense, setEditExpense] = useState<ExpenseReportRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseReportRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function expenseCategoryLabel(category: string): string {
    const key = `expense_${category}` as "expense_supplies" | "expense_transport" | "expense_other";
    if (category === "supplies" || category === "transport" || category === "other") {
      return t(key);
    }
    return category;
  }

  if (expenses.length === 0) {
    return <p className="py-8 text-center text-sm text-salon-muted">{t("noData")}</p>;
  }

  return (
    <>
      <Accordion type="single" collapsible className="flex flex-col gap-2">
        {expenses.map((expense) => (
          <AccordionItem
            key={expense.id}
            value={expense.id}
            className="overflow-hidden rounded-xl border border-salon-border bg-white last:border-b"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-start">
                <span className="font-medium text-salon-black">
                  {expenseCategoryLabel(expense.category)}
                </span>
                <span className="text-xs text-salon-muted">
                  {formatReportDateTime(expense.createdAt, locale)}
                </span>
              </span>
              <span className="shrink-0 ps-3 font-semibold text-salon-gold">
                {formatOMR(expense.amount, locale)}
              </span>
            </AccordionTrigger>
            <AccordionContent className="border-t border-salon-border px-4 pb-4 pt-3">
              <dl className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-salon-muted">{t("employee")}</dt>
                  <dd className="font-medium text-salon-black">{expense.employeeName}</dd>
                </div>
                {expense.note ? (
                  <div>
                    <dt className="text-salon-muted">{t("expenseNote")}</dt>
                    <dd className="mt-1 text-salon-black">{expense.note}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditExpense(expense)}
                >
                  {t("edit")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDeleteTarget(expense)}
                >
                  {t("delete")}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <AdminExpenseEditDrawer
        expense={editExpense}
        open={editExpense != null}
        onClose={() => setEditExpense(null)}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title={t("deleteExpenseTitle")}
        description={t("deleteExpenseDescription")}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("cancel")}
        pending={pending}
        onClose={() => {
          setDeleteTarget(null);
          setError(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteExpense(deleteTarget.id);
            if (!result.ok) {
              setError(await translateAdminError(result.error));
              return;
            }
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />

      {error ? (
        <p className="mt-2 text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

export function ReportAttendanceList({
  locale,
  attendanceByEmployee,
}: Pick<ReportTransactionsProps, "locale" | "attendanceByEmployee">) {
  const t = useTranslations("admin.reports");

  if (attendanceByEmployee.length === 0) {
    return <p className="py-8 text-center text-sm text-salon-muted">{t("noData")}</p>;
  }

  return (
    <Accordion type="single" collapsible className="flex flex-col gap-2">
      {attendanceByEmployee.map((row) => (
        <AccordionItem
          key={row.employeeId}
          value={row.employeeId}
          className="overflow-hidden rounded-xl border border-salon-border bg-white last:border-b"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex-1 text-start font-medium text-salon-black">
              {row.employeeName}
            </span>
            <span className="shrink-0 ps-3 text-sm font-semibold text-salon-gold">
              {formatWorkedDuration(row.totalMs, locale)}
            </span>
          </AccordionTrigger>
          <AccordionContent className="border-t border-salon-border px-4 pb-3 pt-2">
            {row.dailyHours.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-salon-muted">
                  {t("dailyHours")}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {row.dailyHours.map((day) => (
                    <li key={day.date} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-salon-black">
                        {formatMuscatDayLabel(day.date, locale)}
                      </span>
                      <span className="shrink-0 font-medium text-salon-gold">
                        {formatWorkedDuration(day.ms, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-salon-muted">
              {t("sessions")}
            </p>
            <ul className="flex flex-col gap-2">
              {row.sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-col gap-0.5 rounded-lg bg-salon-cream/40 px-3 py-2 text-sm"
                >
                  <span className="text-salon-black">
                    {formatReportDateTime(session.checkedInAt, locale)}
                    {session.checkedOutAt ? (
                      <>
                        {" "}
                        {t("sessionTo")} {formatReportDateTime(session.checkedOutAt, locale)}
                      </>
                    ) : (
                      <> · {t("stillCheckedIn")}</>
                    )}
                  </span>
                  <span className="text-xs text-salon-muted">
                    {formatWorkedDuration(session.durationMs, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
