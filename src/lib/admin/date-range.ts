export const REPORT_TIMEZONE = "Asia/Muscat" as const;

export type DateRange = {
  from: Date;
  to: Date;
};

function muscatDateParts(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
}

function muscatMidnight(year: string, month: string, day: string): Date {
  return new Date(`${year}-${month}-${day}T00:00:00+04:00`);
}

function muscatEndOfDay(year: string, month: string, day: string): Date {
  return new Date(`${year}-${month}-${day}T23:59:59.999+04:00`);
}

export function formatMuscatDateParam(date: Date): string {
  const parts = muscatDateParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function startOfTodayMuscat(): Date {
  const parts = muscatDateParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return muscatMidnight(year, month, day);
}

/** Week boundaries use Sunday as the first day (Gulf convention). */
export type DatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month";

function muscatWeekdayIndex(date: Date): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIMEZONE,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

function muscatYmd(date: Date): { year: string; month: string; day: string } {
  const parts = muscatDateParts(date);
  return {
    year: parts.find((p) => p.type === "year")?.value ?? "1970",
    month: parts.find((p) => p.type === "month")?.value ?? "01",
    day: parts.find((p) => p.type === "day")?.value ?? "01",
  };
}

function addDaysMuscat(year: string, month: string, day: string, days: number): Date {
  const base = muscatMidnight(year, month, day);
  return new Date(base.getTime() + days * 86_400_000);
}

function endOfMonthMuscat(
  year: string,
  month: string,
): { year: string; month: string; day: string } {
  const monthNum = Number.parseInt(month, 10);
  const yearNum = Number.parseInt(year, 10);
  const lastDay = new Date(yearNum, monthNum, 0).getDate();
  return {
    year,
    month,
    day: String(lastDay).padStart(2, "0"),
  };
}

export function resolvePresetRange(preset: DatePreset): DateRange {
  const now = new Date();
  const { year, month, day } = muscatYmd(now);
  const todayFrom = muscatMidnight(year, month, day);
  const todayTo = muscatEndOfDay(year, month, day);

  switch (preset) {
    case "today":
      return { from: todayFrom, to: todayTo };
    case "yesterday": {
      const y = addDaysMuscat(year, month, day, -1);
      const ymd = muscatYmd(y);
      return {
        from: muscatMidnight(ymd.year, ymd.month, ymd.day),
        to: muscatEndOfDay(ymd.year, ymd.month, ymd.day),
      };
    }
    case "this_week": {
      const weekday = muscatWeekdayIndex(now);
      const weekStart = addDaysMuscat(year, month, day, -weekday);
      const startYmd = muscatYmd(weekStart);
      return {
        from: muscatMidnight(startYmd.year, startYmd.month, startYmd.day),
        to: todayTo,
      };
    }
    case "last_week": {
      const weekday = muscatWeekdayIndex(now);
      const thisWeekStart = addDaysMuscat(year, month, day, -weekday);
      const lastWeekEnd = addDaysMuscat(
        muscatYmd(thisWeekStart).year,
        muscatYmd(thisWeekStart).month,
        muscatYmd(thisWeekStart).day,
        -1,
      );
      const lastWeekStart = addDaysMuscat(
        muscatYmd(lastWeekEnd).year,
        muscatYmd(lastWeekEnd).month,
        muscatYmd(lastWeekEnd).day,
        -6,
      );
      const startYmd = muscatYmd(lastWeekStart);
      const endYmd = muscatYmd(lastWeekEnd);
      return {
        from: muscatMidnight(startYmd.year, startYmd.month, startYmd.day),
        to: muscatEndOfDay(endYmd.year, endYmd.month, endYmd.day),
      };
    }
    case "this_month":
      return {
        from: muscatMidnight(year, month, "01"),
        to: todayTo,
      };
    case "last_month": {
      const prevMonthDate = addDaysMuscat(year, month, "01", -1);
      const prev = muscatYmd(prevMonthDate);
      const last = endOfMonthMuscat(prev.year, prev.month);
      return {
        from: muscatMidnight(prev.year, prev.month, "01"),
        to: muscatEndOfDay(last.year, last.month, last.day),
      };
    }
  }
}

export function muscatDayBoundsFromKey(dateKey: string): DateRange {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid Muscat date key: ${dateKey}`);
  }
  const [, year, month, day] = match;
  return {
    from: muscatMidnight(year, month, day),
    to: muscatEndOfDay(year, month, day),
  };
}

/** Inclusive Muscat calendar days from `from` through `to`. */
export function iterMuscatDateKeys(from: Date, to: Date): string[] {
  const keys: string[] = [];
  let { year, month, day } = muscatYmd(from);
  const endKey = formatMuscatDateParam(to);

  for (;;) {
    const key = `${year}-${month}-${day}`;
    keys.push(key);
    if (key >= endKey) break;
    const next = addDaysMuscat(year, month, day, 1);
    ({ year, month, day } = muscatYmd(next));
  }

  return keys;
}

export function resolveReportDateRange(from?: string, to?: string): DateRange {
  const now = new Date();
  const parts = muscatDateParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const today = {
    from: muscatMidnight(year, month, day),
    to: muscatEndOfDay(year, month, day),
  };

  const fromParts = from?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const toParts = to?.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (fromParts && toParts) {
    const rangeFrom = muscatMidnight(fromParts[1], fromParts[2], fromParts[3]);
    const rangeTo = muscatEndOfDay(toParts[1], toParts[2], toParts[3]);
    if (rangeFrom <= rangeTo) return { from: rangeFrom, to: rangeTo };
  }

  return today;
}
