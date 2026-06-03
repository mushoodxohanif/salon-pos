import { iterMuscatDateKeys, muscatDayBoundsFromKey } from "@/lib/admin/date-range";

export function sessionOverlapMs(
  checkedIn: Date,
  checkedOut: Date | null,
  windowStart: Date,
  windowEnd: Date,
): number {
  const sessionEnd = checkedOut ?? windowEnd;
  const overlapStart = Math.max(checkedIn.getTime(), windowStart.getTime());
  const overlapEnd = Math.min(sessionEnd.getTime(), windowEnd.getTime());
  return Math.max(0, overlapEnd - overlapStart);
}

export type DailyHoursEntry = {
  date: string;
  ms: number;
};

/** Splits worked time across Muscat calendar days (handles overnight sessions). */
export function computeDailyHoursForSessions(
  sessions: Array<{ checkedInAt: Date; checkedOutAt: Date | null }>,
  rangeFrom: Date,
  windowEnd: Date,
): DailyHoursEntry[] {
  const dayKeys = iterMuscatDateKeys(rangeFrom, windowEnd);

  return dayKeys
    .map((date) => {
      const { from: dayStart, to: dayEndFull } = muscatDayBoundsFromKey(date);
      const dayEnd = new Date(Math.min(dayEndFull.getTime(), windowEnd.getTime()));
      let ms = 0;
      for (const session of sessions) {
        ms += sessionOverlapMs(session.checkedInAt, session.checkedOutAt, dayStart, dayEnd);
      }
      return { date, ms };
    })
    .filter((entry) => entry.ms > 0);
}

export function formatWorkedDuration(ms: number, locale: "en" | "ar" = "en"): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const h = locale === "ar" ? "س" : "h";
  const m = locale === "ar" ? "د" : "m";
  if (hours === 0) return `${minutes}${m}`;
  if (minutes === 0) return `${hours}${h}`;
  return `${hours}${h} ${minutes}${m}`;
}
