"use server";

import { and, eq, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { attendanceSessions } from "@/lib/db/schema";
import type { AttendanceActionResult } from "./attendance";

export async function checkIn(): Promise<AttendanceActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const db = getDb();
  const [existing] = await db
    .select({ id: attendanceSessions.id })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.employeeId, session.employeeId),
        isNull(attendanceSessions.checkedOutAt),
      ),
    )
    .limit(1);

  if (existing) return { ok: false, error: "already_checked_in" };

  await db.insert(attendanceSessions).values({
    employeeId: session.employeeId,
    branchId: session.branchId,
    checkedInAt: new Date(),
  });

  return { ok: true };
}

export async function checkOut(): Promise<AttendanceActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const db = getDb();
  const [openSession] = await db
    .select({ id: attendanceSessions.id })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.employeeId, session.employeeId),
        isNull(attendanceSessions.checkedOutAt),
      ),
    )
    .limit(1);

  if (!openSession) return { ok: false, error: "not_checked_in" };

  await db
    .update(attendanceSessions)
    .set({ checkedOutAt: new Date() })
    .where(eq(attendanceSessions.id, openSession.id));

  return { ok: true };
}
