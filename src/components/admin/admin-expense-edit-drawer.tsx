"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
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
import { translateAdminError, updateExpense } from "@/lib/admin/actions";
import type { ExpenseReportRow } from "@/lib/admin/reports";
import { parseOMR } from "@/lib/currency";

const CATEGORIES = ["supplies", "transport", "other"] as const;

type AdminExpenseEditDrawerProps = {
  expense: ExpenseReportRow | null;
  open: boolean;
  onClose: () => void;
};

export function AdminExpenseEditDrawer({ expense, open, onClose }: AdminExpenseEditDrawerProps) {
  const t = useTranslations("admin.reports");
  const router = useRouter();
  const [amountInput, setAmountInput] = useState("0.000");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("supplies");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!expense) return;
    setAmountInput(expense.amount.toFixed(3));
    setCategory(
      CATEGORIES.includes(expense.category as (typeof CATEGORIES)[number])
        ? (expense.category as (typeof CATEGORIES)[number])
        : "other",
    );
    setNote(expense.note ?? "");
    setError(null);
  }, [expense]);

  function expenseCategoryLabel(cat: string): string {
    const key = `expense_${cat}` as "expense_supplies" | "expense_transport" | "expense_other";
    if (cat === "supplies" || cat === "transport" || cat === "other") {
      return t(key);
    }
    return cat;
  }

  function handleSave() {
    if (!expense) return;
    setError(null);
    const amount = parseOMR(amountInput);

    startTransition(async () => {
      const result = await updateExpense(expense.id, {
        amount,
        category,
        note: note.trim() || null,
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
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader>
          <DrawerTitle>{t("editExpense")}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-8">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="admin-expense-amount"
              className="text-sm font-semibold text-salon-black"
            >
              {t("expenseAmount")}
            </label>
            <input
              id="admin-expense-amount"
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              onBlur={() => {
                const amount = parseOMR(amountInput);
                if (amount > 0) setAmountInput(amount.toFixed(3));
              }}
              className="min-h-12 rounded-xl border border-salon-border bg-white px-4 text-base outline-none focus:border-salon-gold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="admin-expense-category"
              className="text-sm font-semibold text-salon-black"
            >
              {t("expenseCategory")}
            </label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as (typeof CATEGORIES)[number])}
            >
              <SelectTrigger
                id="admin-expense-category"
                className="min-h-12 w-full rounded-xl border-salon-border"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {expenseCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="admin-expense-note" className="text-sm font-semibold text-salon-black">
              {t("expenseNote")}
            </label>
            <textarea
              id="admin-expense-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="resize-none rounded-xl border border-salon-border bg-white px-4 py-3 text-sm outline-none focus:border-salon-gold"
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 flex-1 bg-salon-black text-salon-cream"
              disabled={pending || parseOMR(amountInput) <= 0}
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
