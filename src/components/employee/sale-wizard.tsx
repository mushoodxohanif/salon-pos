"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { BottomAction } from "@/components/employee/bottom-action";
import { WizardHeader } from "@/components/employee/wizard-header";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/intl/navigation";
import type { Locale } from "@/intl/routing";
import { formatOMR, parseOMR } from "@/lib/currency";
import { createSale, translateActionError } from "@/lib/employee/actions";
import type { ServiceCatalog } from "@/lib/employee/catalog";
import {
  type DiscountPreset,
  discountAmountFromPreset,
  saleTotal,
  subtotalFromItems,
} from "@/lib/employee/sale-math";
import type { SaleLineInput } from "@/lib/sales/validate-sale";
import { cn } from "@/lib/utils";

type CartLine = SaleLineInput & {
  nameEn: string;
  nameAr: string;
};

type SaleWizardProps = {
  catalog: ServiceCatalog;
};

export function SaleWizard({ catalog }: SaleWizardProps) {
  const t = useTranslations("employee.sale");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState(catalog.categories[0]?.id ?? "");
  const [discountPreset, setDiscountPreset] = useState<DiscountPreset>("none");
  const [customDiscountInput, setCustomDiscountInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoriesWithServices = useMemo(
    () => catalog.categories.filter((cat) => (catalog.servicesByCategory[cat.id]?.length ?? 0) > 0),
    [catalog],
  );

  const activeCategory =
    categoriesWithServices.find((c) => c.id === activeCategoryId) ?? categoriesWithServices[0];

  const categoryServices = activeCategory
    ? (catalog.servicesByCategory[activeCategory.id] ?? [])
    : [];

  const subtotal = subtotalFromItems(cart);
  const customDiscountAmount = discountPreset === "custom" ? parseOMR(customDiscountInput) : 0;
  const discountAmount = discountAmountFromPreset(subtotal, discountPreset, customDiscountAmount);
  const total = saleTotal(subtotal, discountAmount);

  const customerLabel = customerName.trim() || t("customerName");

  function goBack() {
    if (step === 1) {
      router.push("/home");
      return;
    }
    setStep((s) => (s === 3 ? 2 : 1));
  }

  function addToCart(
    service: (typeof categoryServices)[0],
    tier: { label: string; amount: number },
  ) {
    if (isTierSelected(service.id, tier.amount, tier.label)) {
      setCart((prev) =>
        prev.filter(
          (item) =>
            !(
              item.serviceId === service.id &&
              Math.abs(item.unitPrice - tier.amount) < 0.0005 &&
              item.priceLabel === tier.label
            ),
        ),
      );
      return;
    }

    const line: CartLine = {
      serviceId: service.id,
      unitPrice: tier.amount,
      priceLabel: tier.label,
      nameEn: service.nameEn,
      nameAr: service.nameAr,
    };
    setCart((prev) => {
      const without = prev.filter((item) => item.serviceId !== service.id);
      return [...without, line];
    });
  }

  function isTierSelected(serviceId: string, amount: number, label: string) {
    return cart.some(
      (item) =>
        item.serviceId === serviceId &&
        Math.abs(item.unitPrice - amount) < 0.0005 &&
        item.priceLabel === label,
    );
  }

  function handleContinueStep1() {
    setStep(2);
  }

  function handleComplete() {
    setError(null);
    setIsSubmitting(true);

    void (async () => {
      const result = await createSale({
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        items: cart.map(({ serviceId, unitPrice, priceLabel }) => ({
          serviceId,
          unitPrice,
          priceLabel,
        })),
        discountPreset,
        customDiscountAmount,
      });

      if (!result.ok) {
        setError(await translateActionError(result.error));
        setIsSubmitting(false);
        return;
      }

      router.replace(`/sale/complete/${result.saleId}`);
    })();
  }

  if (categoriesWithServices.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col px-6 py-12 text-center">
        <p className="text-salon-muted">{t("noServices")}</p>
        <Button className="mt-6" variant="outline" onClick={() => router.push("/home")}>
          {t("backHome")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <WizardHeader
        title={step === 1 ? t("titleNew") : step === 2 ? t("titleServices") : t("titleConfirm")}
        subtitle={
          step === 1
            ? t("step1Subtitle")
            : step === 2
              ? t("step2Subtitle", { customer: customerLabel })
              : t("step3Subtitle")
        }
        step={step}
        onBack={goBack}
      />

      {step === 1 ? (
        <>
          <div className="flex-1 flex flex-col gap-6 px-6 py-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="customer-name" className="text-base font-semibold text-salon-black">
                {t("customerName")}
              </label>
              <p className="text-sm text-salon-muted">{t("customerNameHint")}</p>
              <input
                id="customer-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t("customerPlaceholder")}
                className="min-h-14 rounded-xl border border-salon-border bg-white px-4 text-base text-salon-black outline-none focus:border-salon-gold focus:ring-2 focus:ring-salon-gold/30"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="customer-phone" className="text-base font-semibold text-salon-black">
                {t("customerPhone")}
              </label>
              <p className="text-sm text-salon-muted">{t("customerPhoneHint")}</p>
              <input
                id="customer-phone"
                type="tel"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder={t("customerPhonePlaceholder")}
                className="min-h-14 rounded-xl border border-salon-border bg-white px-4 text-base text-salon-black outline-none focus:border-salon-gold focus:ring-2 focus:ring-salon-gold/30"
              />
            </div>
          </div>

          <BottomAction
            label={t("continue")}
            hint={t("continueHint")}
            onClick={handleContinueStep1}
            disabled={!customerName.trim() || !customerPhone.trim()}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <div className="flex gap-2 overflow-x-auto px-5 pb-3 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
            {categoriesWithServices.map((category) => {
              const selected = category.id === activeCategory?.id;
              const name = locale === "ar" ? category.nameAr : category.nameEn;
              const nameAlt = locale === "ar" ? category.nameEn : category.nameAr;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={cn(
                    "flex min-h-12 shrink-0 flex-col items-center justify-center rounded-xl px-4 py-2.5",
                    selected
                      ? "bg-salon-black text-salon-cream"
                      : "border border-salon-border bg-white text-salon-black",
                  )}
                >
                  <span className="text-sm font-semibold">{name}</span>
                  <span
                    className={cn("text-[10px]", selected ? "text-salon-gold" : "text-salon-muted")}
                  >
                    {nameAlt}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-4">
            {categoryServices.map((service) => {
              const name = locale === "ar" ? service.nameAr : service.nameEn;
              const nameAlt = locale === "ar" ? service.nameEn : service.nameAr;
              return (
                <div
                  key={service.id}
                  className="flex flex-col gap-3 rounded-[14px] border border-salon-border bg-white p-4"
                >
                  <div>
                    <p className="text-base font-semibold text-salon-black">{name}</p>
                    <p className="text-xs text-salon-muted">{nameAlt}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {service.priceTiers.map((tier) => {
                      const selected = isTierSelected(service.id, tier.amount, tier.label);
                      return (
                        <button
                          key={`${tier.label}-${tier.amount}`}
                          type="button"
                          onClick={() => addToCart(service, tier)}
                          className={cn(
                            "min-h-11 min-w-20 flex-1 rounded-[10px] px-3 py-2.5 text-sm font-semibold",
                            selected
                              ? "bg-salon-gold text-salon-black"
                              : "border border-salon-border bg-salon-cream text-salon-black",
                          )}
                        >
                          {formatOMR(tier.amount, locale)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {cart.length > 0 ? (
            <div className="flex items-center justify-between bg-salon-black px-5 py-3">
              <div>
                <p className="text-xs text-salon-muted">
                  {t("itemsSelected", { count: cart.length })}
                </p>
              </div>
              <p className="text-lg font-bold text-salon-gold">{formatOMR(subtotal, locale)}</p>
            </div>
          ) : null}

          <BottomAction
            label={t("continue")}
            hint={t("continueHint")}
            onClick={() => setStep(3)}
            disabled={cart.length === 0}
          />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-2">
            {cart.map((line) => {
              const name = locale === "ar" ? line.nameAr : line.nameEn;
              const nameAlt = locale === "ar" ? line.nameEn : line.nameAr;
              return (
                <div
                  key={line.serviceId}
                  className="flex items-center justify-between rounded-xl border border-salon-border bg-white px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1 pe-3">
                    <p className="text-[15px] font-semibold text-salon-black">{name}</p>
                    <p className="text-[11px] text-salon-muted">
                      {line.priceLabel ? `${line.priceLabel} · ` : ""}
                      {nameAlt}
                    </p>
                  </div>
                  <p className="shrink-0 text-[15px] font-bold text-salon-black">
                    {formatOMR(line.unitPrice, locale)}
                  </p>
                </div>
              );
            })}

            <div className="mt-2 flex flex-col gap-3">
              <div>
                <p className="text-[15px] font-semibold text-salon-black">{t("discount")}</p>
                <p className="text-xs text-salon-muted">{t("discountHint")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "none", label: t("discountNone"), hint: t("discountNoneAr") },
                    { id: "percent5", label: "5%", hint: t("discount5Ar") },
                    { id: "percent10", label: "10%", hint: t("discount10Ar") },
                    {
                      id: "custom",
                      label: t("discountCustom"),
                      hint: t("discountCustomAr"),
                    },
                  ] as const
                ).map((chip) => {
                  const selected = discountPreset === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setDiscountPreset(chip.id)}
                      className={cn(
                        "flex min-h-12 min-w-18 flex-col items-center justify-center rounded-xl px-4 py-3",
                        chip.id === "custom" &&
                          !selected &&
                          "border-2 border-dashed border-salon-gold",
                        selected
                          ? "bg-salon-black text-salon-cream"
                          : "border border-salon-border bg-white text-salon-black",
                      )}
                    >
                      <span className="text-sm font-semibold">{chip.label}</span>
                      <span
                        className={cn(
                          "text-[10px]",
                          selected ? "text-salon-gold" : "text-salon-muted",
                        )}
                      >
                        {chip.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
              {discountPreset === "custom" ? (
                <input
                  type="text"
                  inputMode="decimal"
                  value={customDiscountInput}
                  onChange={(e) => setCustomDiscountInput(e.target.value)}
                  placeholder={t("customDiscountPlaceholder")}
                  className="min-h-12 rounded-xl border border-salon-border bg-white px-4 text-base outline-none focus:border-salon-gold"
                />
              ) : null}
            </div>

            <div className="mx-0 my-2 flex flex-col items-center rounded-2xl bg-salon-black px-6 py-5">
              <p className="text-xs font-medium tracking-widest text-salon-gold">
                {t("totalLabel")}
              </p>
              <p className="font-display text-4xl font-bold text-salon-gold">
                {formatOMR(total, locale)}
              </p>
              {discountAmount > 0 ? (
                <p className="mt-1 text-xs text-salon-muted">
                  {t("discountApplied", { amount: formatOMR(discountAmount, locale) })}
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="text-center text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <BottomAction
            label={t("completeSale")}
            hint={t("completeSaleHint")}
            onClick={handleComplete}
            disabled={cart.length === 0 || isSubmitting}
            loading={isSubmitting}
          />
        </>
      ) : null}
    </div>
  );
}
