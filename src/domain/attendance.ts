import { prisma } from "@/lib/prisma";
import {
  manilaDateOnly,
  manilaDateString,
  manilaDayOfWeek,
  manilaTimeOnDate,
  minutesBetween,
  nowUtc,
} from "@/lib/manila";
import type { HolidayType, PunchType, Schedule } from "@prisma/client";

export async function getLastPunch(employeeId: string) {
  return prisma.attendanceLog.findFirst({
    where: { employeeId },
    orderBy: { punchedAt: "desc" },
  });
}

export async function isPeriodLockedForDate(companyId: string, manilaDate: Date): Promise<boolean> {
  const locked = await prisma.payrollPeriod.findFirst({
    where: {
      companyId,
      startDate: { lte: manilaDate },
      endDate: { gte: manilaDate },
      status: { in: ["LOCKED", "DRAFT_PAYROLL", "APPROVED", "FINALIZED", "PAID"] },
    },
  });
  return Boolean(locked);
}

export async function clockPunch(params: {
  employeeId: string;
  companyId: string;
  punchType: PunchType;
  ipAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdById?: string | null;
  source?: "CLOCK" | "CORRECTION" | "KIOSK";
  punchedAt?: Date;
  allowLocked?: boolean;
}) {
  const punchedAt = params.punchedAt ?? nowUtc();
  const manilaDate = manilaDateOnly(punchedAt);

  if (!params.allowLocked) {
    const locked = await isPeriodLockedForDate(params.companyId, manilaDate);
    if (locked) throw new Error("Payroll period is locked for this date");
  }

  const last = await getLastPunch(params.employeeId);
  if (params.punchType === "IN" && last?.punchType === "IN") {
    throw new Error("Already clocked in. Clock out first.");
  }
  if (params.punchType === "OUT" && (!last || last.punchType === "OUT")) {
    throw new Error("Not clocked in. Clock in first.");
  }

  const log = await prisma.attendanceLog.create({
    data: {
      employeeId: params.employeeId,
      punchType: params.punchType,
      punchedAt,
      manilaDate,
      source: params.source ?? "CLOCK",
      ipAddress: params.ipAddress ?? null,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      createdById: params.createdById ?? null,
    },
  });

  await recomputeTimesheetDay(params.employeeId, manilaDate);
  // Overnight: also recompute previous Manila day if OUT early morning
  const prev = new Date(manilaDate);
  prev.setUTCDate(prev.getUTCDate() - 1);
  await recomputeTimesheetDay(params.employeeId, prev);

  return log;
}

function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(":").map(Number);
  return { h, m };
}

function overlapMinutes(
  start: Date,
  end: Date,
  windowStart: Date,
  windowEnd: Date
): number {
  const s = Math.max(start.getTime(), windowStart.getTime());
  const e = Math.min(end.getTime(), windowEnd.getTime());
  if (e <= s) return 0;
  return Math.round((e - s) / 60000);
}

async function getScheduleForEmployee(employeeId: string, onDate: Date) {
  const assignment = await prisma.scheduleAssignment.findFirst({
    where: {
      employeeId,
      effectiveFrom: { lte: onDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: onDate } }],
    },
    include: { schedule: true },
    orderBy: { effectiveFrom: "desc" },
  });
  return assignment?.schedule ?? null;
}

async function getHolidayType(
  companyId: string,
  onDate: Date
): Promise<HolidayType | null> {
  const h = await prisma.holiday.findFirst({
    where: { companyId, date: onDate },
  });
  return h?.type ?? null;
}

export async function recomputeTimesheetDay(employeeId: string, manilaDate: Date) {
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: employeeId } });
  const schedule = await getScheduleForEmployee(employeeId, manilaDate);
  const dateStr = manilaDateString(manilaDate);

  // Load punches spanning previous day evening through next morning for overnight
  const dayStart = manilaTimeOnDate(dateStr, "00:00");
  const dayEnd = manilaTimeOnDate(dateStr, "23:59");
  const lookBack = new Date(dayStart.getTime() - 12 * 3600 * 1000);
  const lookAhead = new Date(dayEnd.getTime() + 12 * 3600 * 1000);

  const punches = await prisma.attendanceLog.findMany({
    where: {
      employeeId,
      punchedAt: { gte: lookBack, lte: lookAhead },
    },
    orderBy: { punchedAt: "asc" },
  });

  // Pair IN/OUT
  const pairs: { in: Date; out: Date }[] = [];
  let openIn: Date | null = null;
  let unpaired = false;
  for (const p of punches) {
    if (p.punchType === "IN") {
      if (openIn) unpaired = true;
      openIn = p.punchedAt;
    } else if (p.punchType === "OUT") {
      if (openIn) {
        pairs.push({ in: openIn, out: p.punchedAt });
        openIn = null;
      } else {
        unpaired = true;
      }
    }
  }
  if (openIn) unpaired = true;

  // Attribute pairs that touch this Manila calendar day
  const dayPairs = pairs.filter((pair) => {
    const inDate = manilaDateString(pair.in);
    const outDate = manilaDateString(pair.out);
    return inDate === dateStr || outDate === dateStr;
  });

  let workedMinutes = 0;
  for (const pair of dayPairs) {
    workedMinutes += minutesBetween(pair.in, pair.out);
  }

  const holiday = await getHolidayType(employee.companyId, manilaDate);
  const dow = manilaDayOfWeek(manilaDate);
  const isRest =
    schedule != null
      ? schedule.restDays.includes(dow) || !schedule.workdays.includes(dow)
      : dow === 0 || dow === 6;

  let dayType = "REGULAR";
  if (holiday === "LEGAL") dayType = "LEGAL";
  else if (holiday === "SPECIAL") dayType = "SPECIAL";
  else if (holiday === "COMPANY") dayType = "COMPANY";
  else if (isRest) dayType = "REST";

  let expectedMinutes = 0;
  let lateMinutes = 0;
  let undertimeMinutes = 0;
  let otMinutes = 0;
  let ndMinutes = 0;

  if (schedule && dayType === "REGULAR") {
    const start = manilaTimeOnDate(dateStr, schedule.startTime);
    const end = manilaTimeOnDate(dateStr, schedule.endTime);
    expectedMinutes = Math.max(0, minutesBetween(start, end) - schedule.breakMinutes);

    const firstIn = dayPairs[0]?.in;
    if (firstIn) {
      const graceEnd = new Date(start.getTime() + schedule.graceMinutes * 60000);
      if (firstIn > graceEnd) lateMinutes = minutesBetween(start, firstIn);
    }

    const lastOut = dayPairs[dayPairs.length - 1]?.out;
    if (lastOut && lastOut < end) {
      undertimeMinutes = minutesBetween(lastOut, end);
    }

    const netWorked = Math.max(0, workedMinutes - schedule.breakMinutes);
    otMinutes = Math.max(0, netWorked - expectedMinutes);

    // Night differential window (may span midnight)
    ndMinutes = computeNdMinutes(dayPairs, dateStr, schedule);
  } else if (schedule && dayType !== "REGULAR") {
    // Work on rest/holiday: all worked (minus break heuristic) as OT/premium hours
    otMinutes = Math.max(0, workedMinutes - schedule.breakMinutes);
    ndMinutes = computeNdMinutes(dayPairs, dateStr, schedule);
  } else {
    otMinutes = Math.max(0, workedMinutes);
  }

  const regularMinutes =
    dayType === "REGULAR"
      ? Math.min(
          Math.max(0, workedMinutes - (schedule?.breakMinutes ?? 0) - lateMinutes),
          expectedMinutes
        )
      : 0;

  const existing = await prisma.timesheetDay.findUnique({
    where: { employeeId_manilaDate: { employeeId, manilaDate } },
  });

  if (existing?.isAdjusted) {
    // Keep manual adjustment values but refresh unpaired flag
    await prisma.timesheetDay.update({
      where: { id: existing.id },
      data: { hasUnpairedPunch: unpaired },
    });
    return existing;
  }

  return prisma.timesheetDay.upsert({
    where: { employeeId_manilaDate: { employeeId, manilaDate } },
    create: {
      employeeId,
      manilaDate,
      regularMinutes,
      otMinutes,
      lateMinutes,
      undertimeMinutes,
      ndMinutes,
      dayType,
      hasUnpairedPunch: unpaired,
    },
    update: {
      regularMinutes,
      otMinutes,
      lateMinutes,
      undertimeMinutes,
      ndMinutes,
      dayType,
      hasUnpairedPunch: unpaired,
    },
  });
}

function computeNdMinutes(
  pairs: { in: Date; out: Date }[],
  dateStr: string,
  schedule: Schedule
): number {
  const ndStart = parseHm(schedule.ndStartTime);
  const ndEnd = parseHm(schedule.ndEndTime);
  // Window: dateStr ndStart -> next day ndEnd (typical 22:00-06:00)
  const windowStart = manilaTimeOnDate(dateStr, schedule.ndStartTime);
  const nextDay = new Date(dateStr + "T00:00:00Z");
  // Use string date arithmetic via manila
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextStr = next.toISOString().slice(0, 10);
  const windowEnd =
    ndEnd.h < ndStart.h || (ndEnd.h === ndStart.h && ndEnd.m < ndStart.m)
      ? manilaTimeOnDate(nextStr, schedule.ndEndTime)
      : manilaTimeOnDate(dateStr, schedule.ndEndTime);

  let total = 0;
  for (const pair of pairs) {
    total += overlapMinutes(pair.in, pair.out, windowStart, windowEnd);
  }
  return total;
}
