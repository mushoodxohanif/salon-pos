"use client";

import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "@/intl/navigation";
import type { Locale } from "@/intl/routing";
import {
  formatMuscatDateParam,
  REPORT_TIMEZONE,
  resolveReportDateRange,
  startOfTodayMuscat,
} from "@/lib/admin/date-range";
import type { AdminBranch } from "@/lib/admin/queries";
import type { ReportData } from "@/lib/admin/reports";
import { formatOMR } from "@/lib/currency";
import { cn } from "@/lib/utils";

export type ReportTab = "sales" | "revenue" | "expenses";

type ReportsPanelProps = {
  branches: AdminBranch[];
  data: ReportData;
  locale: Locale;
  branchId: string | null;
  from: string;
  to: string;
  tab: ReportTab;
};

export function ReportsPanel({
  branches,
  data,
  locale,
  branchId,
  from,
  to,
  tab,
}: ReportsPanelProps) {
  const t = useTranslations("admin.reports");
  const router = useRouter();
  const pathname = usePathname();

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      branch: branchId ?? undefined,
      from: from || undefined,
      to: to || undefined,
      tab,
      ...patch,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const branchLabel = (branch: AdminBranch) => (locale === "ar" ? branch.nameAr : branch.nameEn);

  const selectedBranch =
    branchId != null ? branches.find((branch) => branch.id === branchId) : null;

  const resolvedRange = resolveReportDateRange(from || undefined, to || undefined);
  const calendarRange: DayPickerRange = {
    from: resolvedRange.from,
    to: resolvedRange.to,
  };

  const netRevenue = data.revenueTotal - data.expensesTotal;

  function expenseCategoryLabel(category: string): string {
    const key = `expense_${category}` as "expense_supplies" | "expense_transport" | "expense_other";
    if (category === "supplies" || category === "transport" || category === "other") {
      return t(key);
    }
    return category;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 gap-2 border-salon-border bg-white font-normal text-salon-black hover:bg-salon-cream/50"
            >
              <span className="max-w-40 truncate">
                {selectedBranch ? branchLabel(selectedBranch) : t("allBranches")}
              </span>
              <ChevronDownIcon className="size-4 text-salon-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 min-w-48 overflow-y-auto">
            <DropdownMenuRadioGroup
              value={branchId ?? "all"}
              onValueChange={(value) =>
                updateParams({ branch: value === "all" ? undefined : value })
              }
            >
              <DropdownMenuRadioItem value="all">{t("allBranches")}</DropdownMenuRadioItem>
              {branches.map((branch) => (
                <DropdownMenuRadioItem key={branch.id} value={branch.id}>
                  {branchLabel(branch)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 gap-2 border-salon-border bg-white font-normal text-salon-black hover:bg-salon-cream/50"
            >
              <span className="max-w-48 truncate">{formatRangeLabel(resolvedRange, locale)}</span>
              <ChevronDownIcon className="size-4 text-salon-muted" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" collisionPadding={16} className="w-auto p-0">
            <Calendar
              mode="range"
              timeZone={REPORT_TIMEZONE}
              defaultMonth={resolvedRange.from}
              selected={calendarRange}
              onSelect={(selected) => {
                if (!selected?.from) return;
                updateParams({
                  from: formatMuscatDateParam(selected.from),
                  to: selected.to ? formatMuscatDateParam(selected.to) : undefined,
                });
              }}
              disabled={{ after: startOfTodayMuscat() }}
              className="p-2"
            />
          </PopoverContent>
        </Popover>
      </div>

      <Tabs value={tab} onValueChange={(value) => updateParams({ tab: value as ReportTab })}>
        <TabsList variant="line" className="w-full grid grid-cols-3">
          {(["sales", "revenue", "expenses"] as const).map((tabKey) => (
            <TabsTrigger
              key={tabKey}
              value={tabKey}
              className="w-full data-active:text-salon-black data-active:after:bg-salon-gold"
            >
              {t(`tab_${tabKey}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="sales">
          <ReportList
            empty={t("noData")}
            rows={data.salesByEmployee.map((row) => ({
              id: row.employeeId,
              title: row.employeeName,
              subtitle: t("salesCount", { count: row.saleCount }),
              amount: formatOMR(row.revenueTotal, locale),
            }))}
          />
        </TabsContent>

        <TabsContent value="revenue">
          <div className="flex flex-col gap-3">
            <SummaryCard label={t("totalRevenue")} value={formatOMR(data.revenueTotal, locale)} />
            <SummaryCard label={t("saleCount")} value={String(data.saleCount)} highlight={false} />
            <SummaryCard label={t("totalExpenses")} value={formatOMR(data.expensesTotal, locale)} />
            <SummaryCard
              label={t("netRevenue")}
              value={formatOMR(netRevenue, locale)}
              highlight={netRevenue >= 0}
            />
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <ReportList
            empty={t("noData")}
            rows={data.expensesByCategory.map((row) => ({
              id: row.category,
              title: expenseCategoryLabel(row.category),
              subtitle: t("expenseCount", { count: row.count }),
              amount: formatOMR(row.total, locale),
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatRangeLabel(resolvedRange: { from: Date; to: Date }, locale: Locale): string {
  const formatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM" : "en-OM", {
    timeZone: REPORT_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(resolvedRange.from)} – ${formatter.format(resolvedRange.to)}`;
}

function SummaryCard({
  label,
  value,
  highlight = true,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-salon-border bg-white p-5 shadow-sm">
      <p className="text-sm text-salon-muted">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-bold",
          highlight ? "text-salon-gold" : "text-salon-black",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ReportList({
  rows,
  empty,
}: {
  rows: { id: string; title: string; subtitle: string; amount: string }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-salon-muted">{empty}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-salon-border bg-white px-4 py-3"
        >
          <div>
            <p className="font-medium text-salon-black">{row.title}</p>
            <p className="text-xs text-salon-muted">{row.subtitle}</p>
          </div>
          <p className="font-semibold text-salon-gold">{row.amount}</p>
        </li>
      ))}
    </ul>
  );
}
