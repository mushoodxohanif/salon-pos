import { eq } from "drizzle-orm";
import { ChevronRight, History, MapPin, Receipt, Wallet } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AttendanceCard } from "@/components/employee/attendance-card";
import { Link } from "@/intl/navigation";
import type { Locale } from "@/intl/routing";
import { getSession } from "@/lib/auth/session";
import { formatOMR } from "@/lib/currency";
import { getDb } from "@/lib/db";
import { branches, employees } from "@/lib/db/schema";
import { formatWorkedDuration, getAttendanceStatus } from "@/lib/employee/attendance";
import { getTodaySummary } from "@/lib/employee/today-summary";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function EmployeeHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;

  const t = await getTranslations("employee");
  const session = await getSession();

  let branchName: string | null = null;
  let employeeName: string | null = null;
  let todaySales = 0;
  let todayRevenue = 0;
  let attendanceCheckedIn = false;
  let attendanceCheckedInTime: string | null = null;
  let attendanceHoursToday = "0m";

  if (session) {
    const db = getDb();
    const [branch] = await db
      .select({ nameEn: branches.nameEn, nameAr: branches.nameAr })
      .from(branches)
      .where(eq(branches.id, session.branchId))
      .limit(1);
    branchName = typedLocale === "ar" ? branch?.nameAr : branch?.nameEn;

    const [employee] = await db
      .select({ name: employees.name })
      .from(employees)
      .where(eq(employees.id, session.employeeId))
      .limit(1);
    employeeName = employee?.name ?? null;

    const summary = await getTodaySummary(session.branchId, session.employeeId);
    todaySales = summary.saleCount;
    todayRevenue = summary.revenueTotal;

    const attendance = await getAttendanceStatus();
    if (attendance) {
      attendanceCheckedIn = attendance.isCheckedIn;
      attendanceHoursToday = formatWorkedDuration(attendance.workedMsToday, typedLocale);
      if (attendance.checkedInAt) {
        attendanceCheckedInTime = new Intl.DateTimeFormat(
          typedLocale === "ar" ? "ar-OM" : "en-OM",
          { timeStyle: "short", timeZone: "Asia/Muscat" },
        ).format(attendance.checkedInAt);
      }
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {branchName ? (
        <div className="px-5 pb-2 pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-salon-black px-3.5 py-2 text-sm font-semibold text-salon-cream">
            <MapPin className="size-3.5 text-salon-gold" aria-hidden />
            {branchName}
          </span>
        </div>
      ) : null}

      <div className="px-6 pb-4">
        <h1 className="font-display text-[26px] font-bold text-salon-black">
          {employeeName ? t("greeting", { name: employeeName }) : t("homeTitle")}
        </h1>
        {employeeName ? (
          <p className="mt-1 text-sm text-salon-muted">{t("greetingAr", { name: employeeName })}</p>
        ) : null}
      </div>

      <div className="px-6 pb-5">
        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-salon-border bg-white px-5 py-3">
          <span className="text-sm font-medium text-salon-muted">{t("todayLabel")}</span>
          <span className="text-sm font-semibold text-salon-black">
            {t("todaySales", { count: todaySales })}
          </span>
          <span className="size-1 shrink-0 rounded-full bg-salon-gold" aria-hidden />
          <span className="text-sm font-bold text-salon-gold">
            {formatOMR(todayRevenue, typedLocale)}
          </span>
        </div>
      </div>

      {session ? (
        <div className="px-6 pb-5">
          <AttendanceCard
            isCheckedIn={attendanceCheckedIn}
            checkedInTimeLabel={attendanceCheckedInTime}
            hoursTodayLabel={attendanceHoursToday}
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 px-6 pb-8">
        <HomeActionCard
          href="/sale"
          variant="primary"
          title={t("recordSale")}
          subtitle={t("recordSaleAr")}
          icon={<Receipt className="size-10 text-salon-gold" aria-hidden />}
        />
        <HomeActionCard
          href="/expense"
          variant="secondary"
          title={t("addExpense")}
          subtitle={t("addExpenseAr")}
          icon={<Wallet className="size-10 text-salon-gold" aria-hidden />}
        />
        <HomeActionCard
          href="/history"
          variant="secondary"
          title={t("salesHistory")}
          subtitle={t("salesHistoryAr")}
          icon={<History className="size-10 text-salon-gold" aria-hidden />}
        />
      </div>
    </main>
  );
}

function HomeActionCard({
  href,
  variant,
  title,
  subtitle,
  icon,
}: {
  href: string;
  variant: "primary" | "secondary";
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[180px] flex-1 flex-col justify-between rounded-[20px] p-6 transition-opacity hover:opacity-95 active:opacity-90",
        variant === "primary"
          ? "bg-salon-black text-salon-cream"
          : "border-2 border-salon-gold bg-white text-salon-black",
      )}
    >
      <div className="flex items-start justify-between">
        {icon}
        <ChevronRight
          className={cn(
            "size-6 rtl:rotate-180",
            variant === "primary" ? "text-salon-muted" : "text-salon-muted",
          )}
          aria-hidden
        />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p
          className={cn("text-sm", variant === "primary" ? "text-salon-gold" : "text-salon-muted")}
        >
          {subtitle}
        </p>
      </div>
    </Link>
  );
}
