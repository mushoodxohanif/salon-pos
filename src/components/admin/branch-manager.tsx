"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useRouter } from "@/intl/navigation";
import {
  createBranch,
  deactivateBranch,
  translateAdminError,
  updateBranch,
} from "@/lib/admin/actions";
import type { AdminBranch } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

type BranchManagerProps = {
  branches: AdminBranch[];
  locale: string;
};

type FormMode = { type: "closed" } | { type: "create" } | { type: "edit"; branch: AdminBranch };

export function BranchManager({ branches, locale }: BranchManagerProps) {
  const t = useTranslations("admin.branches");
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>({ type: "closed" });
  const [deactivateTarget, setDeactivateTarget] = useState<AdminBranch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const displayName = (branch: AdminBranch) => (locale === "ar" ? branch.nameAr : branch.nameEn);

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        className="min-h-12 w-full bg-salon-black text-salon-cream hover:bg-salon-black/90"
        onClick={() => setMode({ type: "create" })}
      >
        {t("addBranch")}
      </Button>

      <ul className="flex flex-col gap-3">
        {branches.map((branch) => (
          <li
            key={branch.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-salon-border bg-white p-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-salon-black">{displayName(branch)}</p>
              {branch.phone ? (
                <p className="mt-0.5 text-sm text-salon-muted">{branch.phone}</p>
              ) : null}
              {!branch.isActive ? (
                <span className="mt-1 inline-block rounded-full bg-salon-muted/15 px-2 py-0.5 text-xs font-medium text-salon-muted">
                  {t("inactive")}
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMode({ type: "edit", branch })}
              >
                {t("edit")}
              </Button>
              {branch.isActive ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeactivateTarget(branch)}
                >
                  {t("delete")}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={deactivateTarget != null}
        title={t("deleteTitle")}
        description={t("deleteDescription", {
          name: deactivateTarget ? displayName(deactivateTarget) : "",
        })}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("cancel")}
        pending={pending}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (!deactivateTarget) return;
          setError(null);
          startTransition(async () => {
            const result = await deactivateBranch(deactivateTarget.id);
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
        <BranchFormDrawer
          mode={mode}
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
                  ? await createBranch(values)
                  : await updateBranch(mode.branch.id, { ...values, isActive: values.isActive });

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

type BranchFormValues = {
  nameEn: string;
  nameAr: string;
  address: string;
  phone: string;
  isActive: boolean;
};

function BranchFormDrawer({
  mode,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  mode: Exclude<FormMode, { type: "closed" }>;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: BranchFormValues) => void;
}) {
  const t = useTranslations("admin.branches");
  const isEdit = mode.type === "edit";
  const initial = isEdit
    ? {
        nameEn: mode.branch.nameEn,
        nameAr: mode.branch.nameAr,
        address: mode.branch.address ?? "",
        phone: mode.branch.phone ?? "",
        isActive: mode.branch.isActive,
      }
    : { nameEn: "", nameAr: "", address: "", phone: "", isActive: true };

  const [values, setValues] = useState(initial);

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90dvh] bg-white flex flex-col overflow-hidden data-[vaul-drawer-direction=bottom]:overflow-hidden">
        <DrawerHeader className="px-6 pt-4 text-start shrink-0">
          <DrawerTitle className="font-display text-xl font-bold text-salon-black">
            {isEdit ? t("editBranch") : t("addBranch")}
          </DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto px-6 pb-6 flex-1 min-h-0">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit({
                nameEn: values.nameEn,
                nameAr: values.nameAr,
                address: values.address,
                phone: values.phone,
                isActive: values.isActive,
              });
            }}
          >
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
            <Field label={t("address")}>
              <input
                className={inputClass}
                value={values.address}
                onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
              />
            </Field>
            <Field label={t("phone")}>
              <input
                className={inputClass}
                type="tel"
                value={values.phone}
                onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
              />
            </Field>

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
