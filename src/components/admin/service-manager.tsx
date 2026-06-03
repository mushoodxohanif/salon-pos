"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "@/intl/navigation";
import type { Locale } from "@/intl/routing";
import {
  createService,
  deactivateService,
  translateAdminError,
  updateService,
} from "@/lib/admin/actions";
import type { AdminService, AdminServiceCategory } from "@/lib/admin/queries";
import { formatOMR, parseOMR } from "@/lib/currency";
import type { PriceTier } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type ServiceManagerProps = {
  categories: AdminServiceCategory[];
  servicesByCategory: Record<string, AdminService[]>;
  locale: Locale;
};

type FormMode =
  | { type: "closed" }
  | { type: "create"; categoryId: string }
  | { type: "edit"; service: AdminService };

type OpenFormMode = Exclude<FormMode, { type: "closed" }>;

export function ServiceManager({ categories, servicesByCategory, locale }: ServiceManagerProps) {
  const t = useTranslations("admin.services");
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>({ type: "closed" });
  const [deactivateTarget, setDeactivateTarget] = useState<AdminService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categoryName = (cat: AdminServiceCategory) => (locale === "ar" ? cat.nameAr : cat.nameEn);

  const serviceName = (svc: AdminService) => (locale === "ar" ? svc.nameAr : svc.nameEn);

  return (
    <div className="flex flex-col gap-4 pb-8">
      <Accordion type="single" collapsible defaultValue={categories[0]?.id} className="gap-4">
        {categories.map((category) => {
          const services = servicesByCategory[category.id] ?? [];

          return (
            <AccordionItem
              key={category.id}
              value={category.id}
              className="overflow-hidden rounded-2xl border border-salon-border bg-white shadow-sm last:border-b"
            >
              <AccordionTrigger className="px-4 flex items-center justify-center">
                <span className="flex-1 font-semibold text-salon-black">
                  {categoryName(category)}
                </span>
                <span className="text-sm font-normal text-salon-muted pr-4">
                  {services.length} {t("serviceCount")}
                </span>
              </AccordionTrigger>

              <AccordionContent className="border-t border-salon-border pb-0">
                <ul>
                  {services.map((service) => (
                    <li
                      key={service.id}
                      className="flex items-center justify-between gap-3 border-b border-salon-border/60 px-4 py-3 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            service.isActive ? "text-salon-black" : "text-salon-muted line-through",
                          )}
                        >
                          {serviceName(service)}
                        </p>
                        <p className="mt-0.5 text-xs text-salon-gold">
                          {service.priceTiers
                            .map((tier) => formatOMR(tier.amount, locale))
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMode({ type: "edit", service })}
                        >
                          {t("edit")}
                        </Button>
                        {service.isActive ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeactivateTarget(service)}
                          >
                            {t("delete")}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                  <li className="px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setMode({ type: "create", categoryId: category.id })}
                    >
                      <Plus className="size-4" aria-hidden />
                      {t("addService")}
                    </Button>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <ConfirmDialog
        open={deactivateTarget != null}
        title={t("deleteTitle")}
        description={t("deleteDescription", {
          name: deactivateTarget ? serviceName(deactivateTarget) : "",
        })}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("cancel")}
        pending={pending}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (!deactivateTarget) return;
          setError(null);
          startTransition(async () => {
            const result = await deactivateService(deactivateTarget.id);
            if (!result.ok) {
              setError(await translateAdminError(result.error));
              return;
            }
            setDeactivateTarget(null);
            router.refresh();
          });
        }}
      />

      {error && deactivateTarget == null ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {mode.type !== "closed" ? (
        <ServiceFormDrawer
          mode={mode}
          categories={categories}
          pending={pending}
          error={error}
          onClose={() => {
            setMode({ type: "closed" });
            setError(null);
          }}
          onSubmit={(values) => {
            setError(null);
            startTransition(async () => {
              const result =
                mode.type === "create"
                  ? await createService(values)
                  : await updateService(mode.service.id, values);

              if (!result.ok) {
                setError(await translateAdminError(result.error));
                return;
              }

              setMode({ type: "closed" });
              router.refresh();
            });
          }}
        />
      ) : null}
    </div>
  );
}

type ServiceFormValues = {
  categoryId: string;
  nameEn: string;
  nameAr: string;
  priceTiers: PriceTier[];
  isActive: boolean;
};

type EditablePriceTier = PriceTier & { key: string };

function createEditableTier(tier: PriceTier = { label: "Standard", amount: 0 }): EditablePriceTier {
  return { ...tier, key: crypto.randomUUID() };
}

function ServiceFormDrawer({
  mode,
  categories,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  mode: OpenFormMode;
  categories: AdminServiceCategory[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: ServiceFormValues) => void;
}) {
  const t = useTranslations("admin.services");
  const isEdit = mode.type === "edit";

  const [values, setValues] = useState<
    Omit<ServiceFormValues, "priceTiers"> & { priceTiers: EditablePriceTier[] }
  >(() => {
    if (mode.type === "edit") {
      return {
        categoryId: mode.service.categoryId,
        nameEn: mode.service.nameEn,
        nameAr: mode.service.nameAr,
        priceTiers: mode.service.priceTiers.length
          ? mode.service.priceTiers.map((tier) => createEditableTier(tier))
          : [createEditableTier()],
        isActive: mode.service.isActive,
      };
    }
    return {
      categoryId: mode.categoryId,
      nameEn: "",
      nameAr: "",
      priceTiers: [createEditableTier()],
      isActive: true,
    };
  });

  function updateTier(key: string, patch: Partial<PriceTier>) {
    setValues((v) => ({
      ...v,
      priceTiers: v.priceTiers.map((tier) => (tier.key === key ? { ...tier, ...patch } : tier)),
    }));
  }

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90dvh] bg-white flex flex-col overflow-hidden data-[vaul-drawer-direction=bottom]:overflow-hidden">
        <DrawerHeader className="px-6 pt-4 text-start shrink-0">
          <DrawerTitle className="font-display text-xl font-bold text-salon-black">
            {isEdit ? t("editService") : t("addService")}
          </DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto px-6 pb-6 flex-1 min-h-0">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit({
                ...values,
                priceTiers: values.priceTiers.map(({ label, amount }) => ({
                  label,
                  amount: parseOMR(String(amount)),
                })),
              });
            }}
          >
            <Field label={t("category")}>
              <Select
                value={values.categoryId}
                onValueChange={(categoryId) => setValues((v) => ({ ...v, categoryId }))}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("nameEn")}>
              <input
                className={inputClass}
                value={values.nameEn}
                onChange={(e) => setValues((v) => ({ ...v, nameEn: e.target.value }))}
                required
              />
            </Field>
            <Field label={t("nameAr")}>
              <input
                className={inputClass}
                dir="rtl"
                value={values.nameAr}
                onChange={(e) => setValues((v) => ({ ...v, nameAr: e.target.value }))}
                required
              />
            </Field>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-salon-black">{t("priceTiers")}</span>
              {values.priceTiers.map((tier) => (
                <div key={tier.key} className="flex gap-2">
                  <input
                    className={cn(inputClass, "flex-1")}
                    placeholder={t("tierLabel")}
                    value={tier.label}
                    onChange={(e) => updateTier(tier.key, { label: e.target.value })}
                  />
                  <input
                    className={cn(inputClass, "w-28")}
                    inputMode="decimal"
                    value={String(tier.amount)}
                    onChange={(e) =>
                      updateTier(tier.key, {
                        amount: parseOMR(e.target.value) as unknown as number,
                      })
                    }
                  />
                  {values.priceTiers.length > 1 ? (
                    <button
                      type="button"
                      aria-label={t("removeTier")}
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-salon-border"
                      onClick={() =>
                        setValues((v) => ({
                          ...v,
                          priceTiers: v.priceTiers.filter((t) => t.key !== tier.key),
                        }))
                      }
                    >
                      <Trash2 className="size-4 text-salon-muted" />
                    </button>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setValues((v) => ({
                    ...v,
                    priceTiers: [...v.priceTiers, createEditableTier({ label: "", amount: 0 })],
                  }))
                }
              >
                {t("addTier")}
              </Button>
            </div>

            {isEdit ? (
              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-salon-border px-4">
                <span className="text-sm font-medium text-salon-black">{t("active")}</span>
                <input
                  type="checkbox"
                  checked={values.isActive}
                  onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
                  className="size-5 accent-salon-gold"
                />
              </label>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="min-h-12 flex-1" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="min-h-12 flex-1 bg-salon-gold text-salon-black hover:bg-salon-gold/90"
              >
                {pending ? t("saving") : t("save")}
              </Button>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-salon-black">{label}</span>
      {children}
    </div>
  );
}

const inputClass = cn(
  "min-h-12 w-full rounded-xl border border-salon-border bg-white px-4 text-base text-salon-black outline-none focus-visible:border-salon-gold focus-visible:ring-2 focus-visible:ring-salon-gold/30",
);

const selectTriggerClass = cn(inputClass, "justify-between [&_svg]:text-salon-muted");
