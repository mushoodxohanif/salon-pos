"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/intl/navigation";
import { translateActionError } from "@/lib/employee/actions";
import { checkIn, checkOut } from "@/lib/employee/attendance-actions";

type AttendanceCardProps = {
  isCheckedIn: boolean;
  checkedInTimeLabel: string | null;
  hoursTodayLabel: string;
};

export function AttendanceCard({
  isCheckedIn,
  checkedInTimeLabel,
  hoursTodayLabel,
}: AttendanceCardProps) {
  const t = useTranslations("employee.attendance");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    setError(null);
    startTransition(() => {
      void (async () => {
        const result = isCheckedIn ? await checkOut() : await checkIn();
        if (!result.ok) {
          setError(await translateActionError(result.error));
          return;
        }
        router.refresh();
      })();
    });
  }

  return (
    <div className="rounded-xl border border-salon-border bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Clock className="mt-0.5 size-5 shrink-0 text-salon-gold" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-salon-black">
              {isCheckedIn && checkedInTimeLabel
                ? t("checkedInSince", { time: checkedInTimeLabel })
                : t("notCheckedIn")}
            </p>
            <p className="mt-1 text-xs text-salon-muted">
              {t("hoursToday", { duration: hoursTodayLabel })}
            </p>
            {error ? (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant={isCheckedIn ? "outline" : "default"}
          size="sm"
          disabled={pending}
          onClick={handleToggle}
          className={
            isCheckedIn
              ? "shrink-0 border-salon-border"
              : "shrink-0 bg-salon-black text-salon-cream hover:bg-salon-black/90"
          }
        >
          {isCheckedIn ? t("checkOut") : t("checkIn")}
        </Button>
      </div>
    </div>
  );
}
