"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
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
import { createEmployee, translateAdminError, updateEmployee } from "@/lib/admin/actions";
import type { AdminBranch, AdminEmployee } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

type EmployeeManagerProps = {
  employees: AdminEmployee[];
  branches: AdminBranch[];
  locale: string;
};

type FormMode = { type: "closed" } | { type: "create" } | { type: "edit"; employee: AdminEmployee };

export function EmployeeManager({ employees, branches, locale }: EmployeeManagerProps) {
  const t = useTranslations("admin.employees");
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>({ type: "closed" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const branchLabel = (emp: AdminEmployee) =>
    locale === "ar" ? emp.branchNameAr : emp.branchNameEn;

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        className="min-h-12 w-full bg-salon-black text-salon-cream hover:bg-salon-black/90"
        onClick={() => setMode({ type: "create" })}
      >
        {t("addEmployee")}
      </Button>

      <ul className="flex flex-col gap-3">
        {employees.map((employee) => (
          <li
            key={employee.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-salon-border bg-white p-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-salon-black">{employee.name}</p>
              <p className="mt-0.5 text-sm text-salon-muted">{branchLabel(employee)}</p>
              <p className="mt-0.5 text-xs text-salon-muted">
                {employee.authType === "pin" ? t("authPin") : t("authPassword")}
                {employee.role === "admin" ? ` · ${t("roleAdmin")}` : null}
                {!employee.isActive ? ` · ${t("inactive")}` : null}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMode({ type: "edit", employee })}
            >
              {t("edit")}
            </Button>
          </li>
        ))}
      </ul>

      {mode.type !== "closed" ? (
        <EmployeeFormDrawer
          mode={mode}
          branches={branches.filter((b) => b.isActive)}
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
                  ? await createEmployee(values)
                  : await updateEmployee(mode.employee.id, {
                      ...values,
                      isActive: values.isActive,
                      resetPin: values.resetPin,
                      resetPassword: values.resetPassword,
                    });

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

type EmployeeFormValues = {
  name: string;
  branchId: string;
  authType: "pin" | "password";
  pin?: string;
  username?: string;
  password?: string;
  role: "employee" | "admin";
  isActive: boolean;
  resetPin?: string;
  resetPassword?: string;
};

function EmployeeFormDrawer({
  mode,
  branches,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  mode: Exclude<FormMode, { type: "closed" }>;
  branches: AdminBranch[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: EmployeeFormValues) => void;
}) {
  const t = useTranslations("admin.employees");
  const isEdit = mode.type === "edit";
  const defaultBranchId = branches[0]?.id ?? "";

  const [values, setValues] = useState<EmployeeFormValues>(() => {
    if (isEdit) {
      return {
        name: mode.employee.name,
        branchId: mode.employee.branchId,
        authType: mode.employee.authType,
        username: mode.employee.username ?? "",
        role: mode.employee.role,
        isActive: mode.employee.isActive,
      };
    }
    return {
      name: "",
      branchId: defaultBranchId,
      authType: "pin",
      pin: "",
      username: "",
      password: "",
      role: "employee",
      isActive: true,
    };
  });

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90dvh] bg-white flex flex-col overflow-hidden data-[vaul-drawer-direction=bottom]:overflow-hidden">
        <DrawerHeader className="px-6 pt-4 text-start shrink-0">
          <DrawerTitle className="font-display text-xl font-bold text-salon-black">
            {isEdit ? t("editEmployee") : t("addEmployee")}
          </DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto px-6 pb-6 flex-1 min-h-0">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(values);
            }}
          >
            <Field label={t("name")}>
              <input
                className={inputClass}
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                required
              />
            </Field>

            <Field label={t("branch")}>
              <Select
                value={values.branchId}
                onValueChange={(branchId) => setValues((v) => ({ ...v, branchId }))}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t("role")}>
              <Select
                value={values.role}
                onValueChange={(role) =>
                  setValues((v) => ({ ...v, role: role as "employee" | "admin" }))
                }
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">{t("roleEmployee")}</SelectItem>
                  <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {!isEdit ? (
              <div className="flex gap-2">
                {(["pin", "password"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, authType: type }))}
                    className={cn(
                      "min-h-11 flex-1 rounded-xl border text-sm font-medium transition-colors",
                      values.authType === type
                        ? "border-salon-gold bg-salon-gold/15 text-salon-black"
                        : "border-salon-border bg-white text-salon-muted",
                    )}
                  >
                    {type === "pin" ? t("authPin") : t("authPassword")}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-salon-muted">
                {values.authType === "pin" ? t("authPin") : t("authPassword")}
              </p>
            )}

            {values.authType === "pin" ? (
              <Field label={isEdit ? t("resetPin") : t("pin")}>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  value={isEdit ? (values.resetPin ?? "") : (values.pin ?? "")}
                  onChange={(e) =>
                    setValues((v) =>
                      isEdit ? { ...v, resetPin: e.target.value } : { ...v, pin: e.target.value },
                    )
                  }
                  required={!isEdit}
                  placeholder={isEdit ? t("resetPinHint") : undefined}
                />
              </Field>
            ) : (
              <>
                <Field label={t("username")}>
                  <input
                    className={inputClass}
                    value={values.username ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
                    required={!isEdit}
                  />
                </Field>
                <Field label={isEdit ? t("resetPassword") : t("password")}>
                  <input
                    className={inputClass}
                    type="password"
                    value={isEdit ? (values.resetPassword ?? "") : (values.password ?? "")}
                    onChange={(e) =>
                      setValues((v) =>
                        isEdit
                          ? { ...v, resetPassword: e.target.value }
                          : { ...v, password: e.target.value },
                      )
                    }
                    required={!isEdit}
                    placeholder={isEdit ? t("resetPasswordHint") : undefined}
                  />
                </Field>
              </>
            )}

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
