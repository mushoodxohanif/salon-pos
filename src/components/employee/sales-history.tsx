import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SaleCodeCopy } from "@/components/employee/sale-code-copy";
import { Link } from "@/intl/navigation";
import type { Locale } from "@/intl/routing";
import { formatOMR } from "@/lib/currency";
import type { EmployeeSaleRow } from "@/lib/employee/queries";

type SalesHistoryProps = {
  sales: EmployeeSaleRow[];
  locale: Locale;
};

export async function SalesHistory({ sales, locale }: SalesHistoryProps) {
  const t = await getTranslations("employee.history");

  if (sales.length === 0) {
    return <p className="px-6 py-8 text-center text-sm text-salon-muted">{t("empty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-3 px-6 pb-8">
      {sales.map((sale) => {
        const dateLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM" : "en-OM", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Muscat",
        }).format(sale.createdAt);

        const customerLabel = sale.customerName?.trim() || t("walkIn");

        return (
          <li
            key={sale.id}
            className="flex items-center gap-3 rounded-2xl border border-salon-border bg-white p-4"
          >
            <Link
              href={`/sale/complete/${sale.id}`}
              className="min-w-0 flex-1 transition-opacity hover:opacity-95 active:opacity-90"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-salon-black" dir="ltr">
                  {sale.saleCode}
                </span>
                <span className="text-sm font-bold text-salon-gold">
                  {formatOMR(sale.total, locale)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-salon-muted">
                <span>{customerLabel}</span>
                <span>{dateLabel}</span>
              </div>
            </Link>
            <SaleCodeCopy saleCode={sale.saleCode} compact />
            <Link
              href={`/sale/complete/${sale.id}`}
              className="shrink-0 text-salon-muted transition-opacity hover:opacity-95"
              aria-hidden
              tabIndex={-1}
            >
              <ChevronRight className="size-5 rtl:rotate-180" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
