import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/employee/page-header";
import { SalesHistory } from "@/components/employee/sales-history";
import type { Locale } from "@/intl/routing";
import { getSession } from "@/lib/auth/session";
import { listEmployeeSales } from "@/lib/employee/queries";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function EmployeeHistoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;

  const t = await getTranslations("employee.history");
  const session = await getSession();
  const sales = session ? await listEmployeeSales(session.employeeId) : [];

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={t("title")} subtitle={t("subtitle")} backHref="/home" />
      <SalesHistory sales={sales} locale={typedLocale} />
    </main>
  );
}
