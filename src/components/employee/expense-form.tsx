"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { BottomAction } from "@/components/employee/bottom-action";
import { PageHeader } from "@/components/employee/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "@/intl/navigation";
import { parseOMR } from "@/lib/currency";
import { createExpense, translateActionError } from "@/lib/employee/actions";

const CATEGORIES = ["supplies", "transport", "other"] as const;

export function ExpenseForm() {
  const t = useTranslations("employee.expense");
  const router = useRouter();
  const [amountInput, setAmountInput] = useState("25.000");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("supplies");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amount = parseOMR(amountInput);

  function handleAmountBlur() {
    if (amount <= 0) return;
    setAmountInput(amount.toFixed(3));
  }

  function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    void (async () => {
      const result = await createExpense({
        amount,
        category,
        note: note.trim() || null,
      });

      if (!result.ok) {
        setError(await translateActionError(result.error));
        setIsSubmitting(false);
        return;
      }

      router.replace("/home");
    })();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title={t("title")} subtitle={t("subtitle")} backHref="/home" />

      <div className="flex flex-1 flex-col gap-5 px-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="expense-amount" className="text-[15px] font-semibold text-salon-black">
            {t("amountLabel")}
          </label>
          <p className="text-xs text-salon-muted">{t("amountHint")}</p>
          <div className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border-2 border-salon-gold bg-white px-4 py-6">
            <span className="font-display text-2xl font-bold text-salon-muted sm:text-3xl">
              OMR
            </span>
            <input
              id="expense-amount"
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              onBlur={handleAmountBlur}
              aria-label={t("amountLabel")}
              className="w-full min-w-0 bg-transparent text-center font-display text-3xl font-bold text-salon-black outline-none sm:text-4xl"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="expense-category" className="text-[15px] font-semibold text-salon-black">
            {t("categoryLabel")}
          </label>
          <p className="text-xs text-salon-muted">{t("categoryHint")}</p>
          <Select
            value={category}
            onValueChange={(value) => setCategory(value as (typeof CATEGORIES)[number])}
          >
            <SelectTrigger
              id="expense-category"
              className="min-h-14 h-auto w-full rounded-xl border-salon-border bg-white px-4 py-3 text-base shadow-none focus-visible:border-salon-gold focus-visible:ring-salon-gold/30 [&_svg]:text-salon-muted"
            >
              <SelectValue className="sr-only" />
            </SelectTrigger>
            <SelectContent position="popper" className="rounded-xl border-salon-border">
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="min-h-12 py-3">
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-salon-black">{t(`categories.${cat}`)}</span>
                    <span className="text-xs text-salon-muted">{t(`categories.${cat}Ar`)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="expense-note" className="text-[15px] font-semibold text-salon-black">
            {t("noteLabel")}
          </label>
          <p className="text-xs text-salon-muted">{t("noteHint")}</p>
          <textarea
            id="expense-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            rows={3}
            className="min-h-20 resize-none rounded-xl border border-salon-border bg-white px-4 py-3 text-[15px] text-salon-black outline-none focus:border-salon-gold focus:ring-2 focus:ring-salon-gold/30"
          />
        </div>

        {error ? (
          <p className="text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <BottomAction
        type="button"
        label={t("save")}
        hint={t("saveHint")}
        onClick={handleSubmit}
        disabled={amount <= 0 || isSubmitting}
        loading={isSubmitting}
      />
    </div>
  );
}
