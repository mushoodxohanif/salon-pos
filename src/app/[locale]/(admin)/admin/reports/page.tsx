import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ReportsPanel, type ReportTab } from "@/components/admin/reports-panel";
import { redirect } from "@/intl/navigation";
import type { Locale } from "@/intl/routing";
import {
  listActiveBranchesForSelect,
  listAdminEmployees,
  listAdminServiceCatalog,
} from "@/lib/admin/queries";
import { getReportData } from "@/lib/admin/reports";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    branch?: string;
    employee?: string;
    from?: string;
    to?: string;
    tab?: string;
  }>;
};

function parseTab(value: string | undefined): ReportTab {
  if (value === "revenue" || value === "expenses" || value === "attendance") return value;
  return "sales";
}

export default async function AdminReportsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("admin.reports");
  const tab = parseTab(query.tab);
  const branchId = query.branch?.trim() || null;
  const employeeId = query.employee?.trim() || null;
  const from = query.from ?? "";
  const to = query.to ?? "";

  const [branches, employees, catalog, data] = await Promise.all([
    listActiveBranchesForSelect(),
    listAdminEmployees(),
    listAdminServiceCatalog(),
    getReportData({
      branchId,
      employeeId,
      from: from || undefined,
      to: to || undefined,
    }),
  ]);

  if (!branches || !employees || !catalog || !data) {
    redirect({ href: "/admin/login", locale });
    return null;
  }

  return (
    <AdminPageShell title={t("title")} subtitle={t("subtitle")}>
      <ReportsPanel
        branches={branches}
        employees={employees}
        categories={catalog.categories}
        servicesByCategory={catalog.servicesByCategory}
        data={data}
        locale={locale as Locale}
        branchId={branchId}
        employeeId={employeeId}
        from={from}
        to={to}
        tab={tab}
      />
    </AdminPageShell>
  );
}
