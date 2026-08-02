"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { clockPunch, recomputeTimesheetDay } from "@/domain/attendance";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { manilaDateOnly } from "@/lib/manila";
import { headers } from "next/headers";

export async function punchAction(punchType: "IN" | "OUT") {
  const user = await requireUser();
  if (!user.employeeId) throw new Error("No employee linked to this user");
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0] ?? null;
  await clockPunch({
    employeeId: user.employeeId,
    companyId: user.companyId,
    punchType,
    ipAddress: ip,
    createdById: user.id,
  });
  await writeAudit({
    companyId: user.companyId,
    actorId: user.id,
    action: `PUNCH_${punchType}`,
    entityType: "AttendanceLog",
    entityId: user.employeeId,
  });
  revalidatePath("/clock");
  revalidatePath("/timesheet");
}

export async function requestMissedPunchAction(formData: FormData) {
  const user = await requireUser();
  if (!user.employeeId) throw new Error("No employee linked");
  const proposedTime = new Date(String(formData.get("proposedTime")));
  const punchType = String(formData.get("punchType")) as "IN" | "OUT";
  const reason = String(formData.get("reason") ?? "");
  if (!reason) throw new Error("Reason required");

  await prisma.missedPunchRequest.create({
    data: {
      employeeId: user.employeeId,
      proposedTime,
      punchType,
      reason,
    },
  });
  revalidatePath("/corrections");
}

export async function reviewMissedPunchAction(formData: FormData) {
  const user = await requireUser(["HR", "ADMIN", "MANAGER"]);
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  const note = String(formData.get("note") ?? "");
  const req = await prisma.missedPunchRequest.findUniqueOrThrow({
    where: { id },
    include: { employee: true },
  });
  if (req.status !== "PENDING") throw new Error("Already reviewed");

  if (decision === "APPROVE") {
    await clockPunch({
      employeeId: req.employeeId,
      companyId: req.employee.companyId,
      punchType: req.punchType,
      punchedAt: req.proposedTime,
      source: "CORRECTION",
      createdById: user.id,
      allowLocked: user.role === "ADMIN",
    });
    await prisma.missedPunchRequest.update({
      where: { id },
      data: { status: "APPROVED", reviewerId: user.id, reviewNote: note || null },
    });
  } else {
    await prisma.missedPunchRequest.update({
      where: { id },
      data: { status: "REJECTED", reviewerId: user.id, reviewNote: note || null },
    });
  }
  revalidatePath("/corrections");
  revalidatePath("/timesheet");
}

export async function adjustTimesheetAction(formData: FormData) {
  const user = await requireUser(["HR", "ADMIN"]);
  const employeeId = String(formData.get("employeeId"));
  const dateStr = String(formData.get("date"));
  const reason = String(formData.get("reason") ?? "");
  if (!reason) throw new Error("Reason required");
  const manilaDate = manilaDateOnly(new Date(dateStr + "T12:00:00Z"));

  const before = await prisma.timesheetDay.findUnique({
    where: { employeeId_manilaDate: { employeeId, manilaDate } },
  });

  await prisma.timesheetDay.upsert({
    where: { employeeId_manilaDate: { employeeId, manilaDate } },
    create: {
      employeeId,
      manilaDate,
      regularMinutes: Number(formData.get("regularMinutes") ?? 0),
      otMinutes: Number(formData.get("otMinutes") ?? 0),
      lateMinutes: Number(formData.get("lateMinutes") ?? 0),
      undertimeMinutes: Number(formData.get("undertimeMinutes") ?? 0),
      ndMinutes: Number(formData.get("ndMinutes") ?? 0),
      dayType: String(formData.get("dayType") ?? "REGULAR"),
      isAdjusted: true,
      adjustmentReason: reason,
    },
    update: {
      regularMinutes: Number(formData.get("regularMinutes") ?? 0),
      otMinutes: Number(formData.get("otMinutes") ?? 0),
      lateMinutes: Number(formData.get("lateMinutes") ?? 0),
      undertimeMinutes: Number(formData.get("undertimeMinutes") ?? 0),
      ndMinutes: Number(formData.get("ndMinutes") ?? 0),
      dayType: String(formData.get("dayType") ?? "REGULAR"),
      isAdjusted: true,
      adjustmentReason: reason,
    },
  });

  await writeAudit({
    companyId: user.companyId,
    actorId: user.id,
    action: "TIMESHEET_ADJUST",
    entityType: "TimesheetDay",
    entityId: employeeId,
    before: before ?? undefined,
    after: { reason },
  });
  revalidatePath("/timesheet");
}

export async function recomputeDayAction(formData: FormData) {
  await requireUser(["HR", "ADMIN"]);
  const employeeId = String(formData.get("employeeId"));
  const dateStr = String(formData.get("date"));
  await prisma.timesheetDay.updateMany({
    where: { employeeId, manilaDate: new Date(dateStr) },
    data: { isAdjusted: false, adjustmentReason: null },
  });
  await recomputeTimesheetDay(employeeId, new Date(dateStr));
  revalidatePath("/timesheet");
}
