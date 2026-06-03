import { and, eq, gte, isNull, or } from "drizzle-orm";
import { startOfTodayMuscat } from "@/lib/admin/date-range";
import { sessionOverlapMs } from "@/lib/attendance-utils";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { attendanceSessions } from "@/lib/db/schema";

export type AttendanceActionResult = { ok: true } | { ok: false; error: string };

export type AttendanceStatus = {
  isCheckedIn: boolean;
  checkedInAt: Date | null;
  workedMsToday: number;
};

export { formatWorkedDuration } from "@/lib/attendance-utils";

export async function getAttendanceStatus(): Promise<AttendanceStatus | null> {
  const session = await getSession();
  if (!session) return null;

  const db = getDb();
  const now = new Date();
  const todayStart = startOfTodayMuscat();

  const [openSession] = await db
    .select({ checkedInAt: attendanceSessions.checkedInAt })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.employeeId, session.employeeId),
        isNull(attendanceSessions.checkedOutAt),
      ),
    )
    .limit(1);

  const sessions = await db
    .select({
      checkedInAt: attendanceSessions.checkedInAt,
      checkedOutAt: attendanceSessions.checkedOutAt,
    })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.employeeId, session.employeeId),
        or(
          gte(attendanceSessions.checkedOutAt, todayStart),
          isNull(attendanceSessions.checkedOutAt),
        ),
      ),
    );

  let workedMsToday = 0;
  for (const row of sessions) {
    workedMsToday += sessionOverlapMs(row.checkedInAt, row.checkedOutAt, todayStart, now);
  }

  return {
    isCheckedIn: !!openSession,
    checkedInAt: openSession?.checkedInAt ?? null,
    workedMsToday,
  };
}
