"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SaleCodeCopy } from "@/components/employee/sale-code-copy";
import { Button } from "@/components/ui/button";
import { Link } from "@/intl/navigation";
import type { Locale } from "@/intl/routing";
import { formatOMR } from "@/lib/currency";

export type SaleReceiptData = {
  id: string;
  saleCode: string;
  customerName: string | null;
  customerPhone: string | null;
  discountAmount: number;
  total: number;
  createdAt: Date;
  items: {
    nameEn: string;
    nameAr: string;
    unitPrice: number;
    priceLabel: string | null;
  }[];
};

type SaleCompleteProps = {
  receipt: SaleReceiptData;
};

export function SaleComplete({ receipt }: SaleCompleteProps) {
  const t = useTranslations("employee.saleComplete");
  const locale = useLocale() as Locale;

  const customerLabel = receipt.customerName?.trim() ?? "";
  const phoneLabel = receipt.customerPhone?.trim() ?? "";

  const dateLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar-OM" : "en-OM", {
    dateStyle: "medium",
    timeZone: "Asia/Muscat",
  }).format(receipt.createdAt);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-10">
        <div className="flex size-20 items-center justify-center rounded-full bg-salon-gold">
          <Check className="size-10 text-salon-black" strokeWidth={2.5} aria-hidden />
        </div>
        <div className="text-center">
          <h1 className="font-display text-[28px] font-bold text-salon-black">{t("title")}</h1>
          <p className="mt-1 text-[15px] text-salon-muted">{t("subtitle")}</p>
        </div>
      </div>

      <div className="px-6">
        <div className="mb-4 rounded-2xl border border-salon-border bg-white p-4">
          <p className="text-xs font-medium text-salon-muted">{t("saleId")}</p>
          <SaleCodeCopy saleCode={receipt.saleCode} className="mt-2" />
        </div>

        <div className="rounded-2xl border border-salon-border bg-white p-5">
          <div className="flex justify-between border-b border-salon-border pb-3 text-xs font-medium text-salon-muted">
            <div className="flex flex-col gap-0.5">
              <span>{customerLabel}</span>
              {phoneLabel ? <span dir="ltr">{phoneLabel}</span> : null}
            </div>
            <span>{dateLabel}</span>
          </div>

          <ul className="flex flex-col gap-4 py-4">
            {receipt.items.map((item) => {
              const name = locale === "ar" ? item.nameAr : item.nameEn;
              const nameAlt = locale === "ar" ? item.nameEn : item.nameAr;
              const lineKey = `${item.nameEn}-${item.priceLabel ?? ""}-${item.unitPrice}`;
              return (
                <li key={lineKey} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-salon-black">{name}</p>
                    <p className="text-[11px] text-salon-muted">
                      {item.priceLabel ? `${item.priceLabel} · ` : ""}
                      {nameAlt}
                    </p>
                  </div>
                  <p className="shrink-0 text-[15px] font-semibold text-salon-black">
                    {formatOMR(item.unitPrice, locale)}
                  </p>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between border-t border-salon-border pt-3">
            <span className="text-sm font-semibold text-salon-black">{t("total")}</span>
            <span className="font-display text-[22px] font-bold text-salon-gold">
              {formatOMR(receipt.total, locale)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 px-6 py-8">
        <Button asChild className="min-h-14 w-full rounded-[14px] text-[17px] font-bold">
          <Link href="/sale">{t("recordAnother")}</Link>
        </Button>
        <p className="text-center text-sm text-salon-muted">{t("recordAnotherHint")}</p>
        <Button
          asChild
          variant="outline"
          className="min-h-14 w-full rounded-[14px] border-2 border-salon-black text-[17px] font-semibold"
        >
          <Link href="/home">{t("backHome")}</Link>
        </Button>
        <p className="text-center text-sm text-salon-muted">{t("backHomeHint")}</p>
      </div>
    </div>
  );
}
