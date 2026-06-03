"use client";

import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DateRange as DayPickerRange } from "react-day-picker";
import {
  ReportAttendanceList,
  ReportExpensesList,
  ReportSalesList,
} from "@/components/admin/report-transactions";
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
  type DatePreset,
  formatMuscatDateParam,
  REPORT_TIMEZONE,
  resolvePresetRange,
  resolveReportDateRange,
  startOfTodayMuscat,
} from "@/lib/admin/date-range";
import type {
  AdminBranch,
  AdminEmployee,
  AdminService,
  AdminServiceCategory,
} from "@/lib/admin/queries";
import type { ReportData } from "@/lib/admin/reports";
import { formatOMR } from "@/lib/currency";
import { cn } from "@/lib/utils";

export type ReportTab = "sales" | "revenue" | "expenses" | "attendance";

const DATE_PRESETS: DatePreset[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
];

type ReportsPanelProps = {
  branches: AdminBranch[];
  employees: AdminEmployee[];
  categories: AdminServiceCategory[];
  servicesByCategory: Record<string, AdminService[]>;
  data: ReportData;
  locale: Locale;
  branchId: string | null;
  employeeId: string | null;
  from: string;
  to: string;
  tab: ReportTab;
};

export function ReportsPanel({
  branches,
  employees,
  categories,
  servicesByCategory,
  data,
  locale,
  branchId,
  employeeId,
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
      employee: employeeId ?? undefined,
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

  function applyPreset(preset: DatePreset) {
    const range = resolvePresetRange(preset);
    updateParams({
      from: formatMuscatDateParam(range.from),
      to: formatMuscatDateParam(range.to),
    });
  }

  const branchLabel = (branch: AdminBranch) => (locale === "ar" ? branch.nameAr : branch.nameEn);

  const selectedBranch =
    branchId != null ? branches.find((branch) => branch.id === branchId) : null;

  const activeEmployees = employees.filter(
    (employee) => employee.isActive && (!branchId || employee.branchId === branchId),
  );

  const selectedEmployee =
    employeeId != null ? activeEmployees.find((employee) => employee.id === employeeId) : null;

  const resolvedRange = resolveReportDateRange(from || undefined, to || undefined);
  const calendarRange: DayPickerRange = {
    from: resolvedRange.from,
    to: resolvedRange.to,
  };

  const netRevenue = data.revenueTotal - data.expensesTotal;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 w-full justify-between gap-2 border-salon-border bg-white font-normal text-salon-black hover:bg-salon-cream/50 sm:w-auto sm:justify-center"
            >
              <span className="min-w-0 truncate">
                {selectedBranch ? branchLabel(selectedBranch) : t("allBranches")}
              </span>
              <ChevronDownIcon className="size-4 text-salon-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 min-w-48 overflow-y-auto">
            <DropdownMenuRadioGroup
              value={branchId ?? "all"}
              onValueChange={(value) =>
                updateParams({
                  branch: value === "all" ? undefined : value,
                  employee: undefined,
                })
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 w-full justify-between gap-2 border-salon-border bg-white font-normal text-salon-black hover:bg-salon-cream/50 sm:w-auto sm:justify-center"
            >
              <span className="min-w-0 truncate">
                {selectedEmployee ? selectedEmployee.name : t("allEmployees")}
              </span>
              <ChevronDownIcon className="size-4 text-salon-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 min-w-48 overflow-y-auto">
            <DropdownMenuRadioGroup
              value={employeeId ?? "all"}
              onValueChange={(value) =>
                updateParams({ employee: value === "all" ? undefined : value })
              }
            >
              <DropdownMenuRadioItem value="all">{t("allEmployees")}</DropdownMenuRadioItem>
              {activeEmployees.map((employee) => (
                <DropdownMenuRadioItem key={employee.id} value={employee.id}>
                  {employee.name}
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
              className="min-h-10 w-full justify-between gap-2 border-salon-border bg-white font-normal text-salon-black hover:bg-salon-cream/50 sm:w-auto sm:justify-center"
            >
              <span className="min-w-0 truncate">{formatRangeLabel(resolvedRange, locale)}</span>
              <ChevronDownIcon className="size-4 shrink-0 text-salon-muted" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="bottom"
            collisionPadding={16}
            className="w-[min(100vw-2rem,20rem)] max-w-[calc(100vw-2rem)] p-0 sm:w-auto sm:max-w-none"
          >
            <div className="grid grid-cols-2 gap-1.5 border-b border-salon-border p-3 sm:flex sm:flex-wrap">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-lg border border-salon-border bg-salon-cream/50 px-2.5 py-1.5 text-xs font-medium text-salon-black hover:bg-salon-gold/20"
                >
                  {t(`preset_${preset}`)}
                </button>
              ))}
            </div>
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
              className="mx-auto w-full max-w-full p-2 [--cell-size:2.25rem] sm:[--cell-size:--spacing(7)]"
              classNames={{
                root: "w-full max-w-full",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Tabs value={tab} onValueChange={(value) => updateParams({ tab: value as ReportTab })}>
        <TabsList variant="line" className="w-full grid grid-cols-4">
          {(["sales", "revenue", "expenses", "attendance"] as const).map((tabKey) => (
            <TabsTrigger
              key={tabKey}
              value={tabKey}
              className="w-full text-xs sm:text-sm data-active:text-salon-black data-active:after:bg-salon-gold"
            >
              {t(`tab_${tabKey}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="sales">
          <ReportSalesList
            locale={locale}
            sales={data.sales}
            categories={categories}
            servicesByCategory={servicesByCategory}
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
          <ReportExpensesList locale={locale} expenses={data.expenses} />
        </TabsContent>

        <TabsContent value="attendance">
          <ReportAttendanceList locale={locale} attendanceByEmployee={data.attendanceByEmployee} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatRangeLabel(resolvedRange: { from: Date; to: Date }, locale: Locale): string {
  const shortFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM" : "en-OM", {
    timeZone: REPORT_TIMEZONE,
    day: "numeric",
    month: "short",
  });
  const fromShort = shortFormatter.format(resolvedRange.from);
  const toShort = shortFormatter.format(resolvedRange.to);

  if (fromShort === toShort) return fromShort;

  const longFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM" : "en-OM", {
    timeZone: REPORT_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${longFormatter.format(resolvedRange.from)} – ${longFormatter.format(resolvedRange.to)}`;
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
