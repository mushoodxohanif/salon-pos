"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useRouter } from "@/intl/navigation";
import type { Locale } from "@/intl/routing";
import { translateAdminError, updateSale } from "@/lib/admin/actions";
import type { AdminService, AdminServiceCategory } from "@/lib/admin/queries";
import type { SaleReportRow } from "@/lib/admin/reports";
import { formatOMR, parseOMR } from "@/lib/currency";
import {
  type DiscountPreset,
  discountAmountFromPreset,
  inferDiscountPreset,
  saleTotal,
  subtotalFromItems,
} from "@/lib/employee/sale-math";
import type { SaleLineInput } from "@/lib/sales/validate-sale";
import { cn } from "@/lib/utils";

type CartLine = SaleLineInput & {
  nameEn: string;
  nameAr: string;
};

type AdminSaleEditDrawerProps = {
  sale: SaleReportRow | null;
  open: boolean;
  onClose: () => void;
  locale: Locale;
  categories: AdminServiceCategory[];
  servicesByCategory: Record<string, AdminService[]>;
};

export function AdminSaleEditDrawer({
  sale,
  open,
  onClose,
  locale,
  categories,
  servicesByCategory,
}: AdminSaleEditDrawerProps) {
  const t = useTranslations("admin.reports");
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "");
  const [discountPreset, setDiscountPreset] = useState<DiscountPreset>("none");
  const [customDiscountInput, setCustomDiscountInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categoriesWithServices = useMemo(
    () => categories.filter((cat) => (servicesByCategory[cat.id]?.length ?? 0) > 0),
    [categories, servicesByCategory],
  );

  const activeCategory =
    categoriesWithServices.find((c) => c.id === activeCategoryId) ?? categoriesWithServices[0];

  const categoryServices = activeCategory ? (servicesByCategory[activeCategory.id] ?? []) : [];

  const subtotal = subtotalFromItems(cart);
  const customDiscountAmount = discountPreset === "custom" ? parseOMR(customDiscountInput) : 0;
  const discountAmount = discountAmountFromPreset(subtotal, discountPreset, customDiscountAmount);
  const total = saleTotal(subtotal, discountAmount);

  useEffect(() => {
    if (!sale) return;
    setCustomerName(sale.customerName ?? "");
    setCustomerPhone(sale.customerPhone ?? "");
    setCart(
      sale.items.map((item) => ({
        serviceId: item.serviceId,
        unitPrice: item.unitPrice,
        priceLabel: item.priceLabel,
        nameEn: item.nameEn,
        nameAr: item.nameAr,
      })),
    );
    const itemSubtotal = subtotalFromItems(sale.items);
    const inferred = inferDiscountPreset(itemSubtotal, sale.discountAmount);
    setDiscountPreset(inferred.preset);
    setCustomDiscountInput(inferred.preset === "custom" ? inferred.customAmount.toFixed(3) : "");
    setActiveCategoryId(categories[0]?.id ?? "");
    setError(null);
  }, [sale, categories]);

  const categoryName = (cat: AdminServiceCategory) => (locale === "ar" ? cat.nameAr : cat.nameEn);

  function isTierSelected(serviceId: string, amount: number, label: string) {
    return cart.some(
      (item) =>
        item.serviceId === serviceId &&
        Math.abs(item.unitPrice - amount) < 0.0005 &&
        item.priceLabel === label,
    );
  }

  function toggleTier(service: AdminService, tier: { label: string; amount: number }) {
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

  function handleSave() {
    if (!sale) return;
    setError(null);

    startTransition(async () => {
      const result = await updateSale(sale.id, {
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
        setError(await translateAdminError(result.error));
        return;
      }

      onClose();
      router.refresh();
    });
  }

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader>
          <DrawerTitle>{t("editSale")}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="admin-sale-customer"
                className="text-sm font-semibold text-salon-black"
              >
                {t("customerName")}
              </label>
              <input
                id="admin-sale-customer"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="min-h-11 rounded-xl border border-salon-border px-3 text-sm outline-none focus:border-salon-gold"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-sale-phone" className="text-sm font-semibold text-salon-black">
                {t("customerPhone")}
              </label>
              <input
                id="admin-sale-phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="min-h-11 rounded-xl border border-salon-border px-3 text-sm outline-none focus:border-salon-gold"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
            {categoriesWithServices.map((category) => {
              const selected = category.id === activeCategory?.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={cn(
                    "shrink-0 rounded-xl px-3 py-2 text-sm font-semibold",
                    selected
                      ? "bg-salon-black text-salon-cream"
                      : "border border-salon-border bg-white text-salon-black",
                  )}
                >
                  {categoryName(category)}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            {categoryServices.map((service) => {
              const name = locale === "ar" ? service.nameAr : service.nameEn;
              return (
                <div
                  key={service.id}
                  className="rounded-xl border border-salon-border bg-white p-3"
                >
                  <p className="text-sm font-semibold text-salon-black">{name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {service.priceTiers.map((tier) => {
                      const selected = isTierSelected(service.id, tier.amount, tier.label);
                      return (
                        <button
                          key={`${tier.label}-${tier.amount}`}
                          type="button"
                          onClick={() => toggleTier(service, tier)}
                          className={cn(
                            "rounded-lg px-3 py-2 text-xs font-semibold",
                            selected
                              ? "bg-salon-gold text-salon-black"
                              : "border border-salon-border bg-salon-cream",
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
            <ul className="flex flex-col gap-2 rounded-xl border border-salon-border bg-salon-cream/30 p-3">
              {cart.map((line) => (
                <li
                  key={`${line.serviceId}-${line.priceLabel}-${line.unitPrice}`}
                  className="flex justify-between text-sm"
                >
                  <span>{locale === "ar" ? line.nameAr : line.nameEn}</span>
                  <span className="font-semibold">{formatOMR(line.unitPrice, locale)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "none", label: t("discountNone") },
                { id: "percent5", label: t("discount5") },
                { id: "percent10", label: t("discount10") },
                { id: "custom", label: t("discountCustom") },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setDiscountPreset(chip.id)}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold",
                  discountPreset === chip.id
                    ? "bg-salon-black text-salon-cream"
                    : "border border-salon-border bg-white",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {discountPreset === "custom" ? (
            <input
              type="text"
              inputMode="decimal"
              value={customDiscountInput}
              onChange={(e) => setCustomDiscountInput(e.target.value)}
              placeholder={t("customDiscountPlaceholder")}
              className="min-h-11 rounded-xl border border-salon-border px-3 text-sm outline-none focus:border-salon-gold"
            />
          ) : null}

          <p className="text-center font-display text-xl font-bold text-salon-gold">
            {formatOMR(total, locale)}
          </p>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 flex-1 bg-salon-black text-salon-cream"
              disabled={pending || cart.length === 0}
              onClick={handleSave}
            >
              {pending ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
