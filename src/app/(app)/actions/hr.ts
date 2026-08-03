"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { parsePesosInput } from "@/lib/money";
import type { CutoffPattern, HolidayType, PayType } from "@prisma/client";

export async function upsertEmployeeAction(formData: FormData) {
  const user = await requireUser(["HR", "ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const basicRateCentavos = parsePesosInput(String(formData.get("basicRatePesos") ?? "0"));
  const data = {
    employeeNo: String(formData.get("employeeNo")),
    badgeCode: String(formData.get("badgeCode") || "").trim() || null,
    firstName: String(formData.get("firstName") ?? "").trim(),
    middleName: String(formData.get("middleName") || "").trim() || null,
    lastName: String(formData.get("lastName") ?? "").trim(),
    suffix: String(formData.get("suffix") || "").trim() || null,
    hireDate: new Date(String(formData.get("hireDate"))),
    endDate: formData.get("endDate") ? new Date(String(formData.get("endDate"))) : null,
    status: String(formData.get("status") ?? "ACTIVE") as "ACTIVE" | "SEPARATED",
    payType: String(formData.get("payType") ?? "MONTHLY") as PayType,
    basicRateCentavos,
    tin: String(formData.get("tin") || "") || null,
    sssNumber: String(formData.get("sssNumber") || "") || null,
    philhealthNumber: String(formData.get("philhealthNumber") || "") || null,
    pagibigNumber: String(formData.get("pagibigNumber") || "") || null,
    departmentId: String(formData.get("departmentId") || "").trim() || null,
    bankCode: String(formData.get("bankCode") || "") || null,
    bankAccountNo: String(formData.get("bankAccountNo") || "") || null,
    bankAccountName: String(formData.get("bankAccountName") || "") || null,
  };

  if (!data.firstName || !data.lastName) {
    throw new Error("First name and last name are required");
  }

  if (id) {
    const before = await prisma.employee.findUniqueOrThrow({ where: { id } });
    const after = await prisma.employee.update({ where: { id }, data });
    await writeAudit({
      companyId: user.companyId,
      actorId: user.id,
      action: "EMPLOYEE_UPDATE",
      entityType: "Employee",
      entityId: id,
      before: {
        basicRateCentavos: before.basicRateCentavos,
        tin: before.tin,
        sssNumber: before.sssNumber,
      },
      after: {
        basicRateCentavos: after.basicRateCentavos,
        tin: after.tin,
        sssNumber: after.sssNumber,
      },
    });
  } else {
    const created = await prisma.employee.create({
      data: { ...data, companyId: user.companyId },
    });
    await writeAudit({
      companyId: user.companyId,
      actorId: user.id,
      action: "EMPLOYEE_CREATE",
      entityType: "Employee",
      entityId: created.id,
      after: data,
    });
  }
  revalidatePath("/employees");
}

export async function upsertScheduleAction(formData: FormData) {
  const user = await requireUser(["HR", "ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const workdays = String(formData.get("workdays") ?? "1,2,3,4,5")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => !Number.isNaN(n));
  const restDays = String(formData.get("restDays") ?? "0,6")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => !Number.isNaN(n));
  const data = {
    name: String(formData.get("name")),
    workdays,
    restDays,
    startTime: String(formData.get("startTime") ?? "09:00"),
    endTime: String(formData.get("endTime") ?? "18:00"),
    breakMinutes: Number(formData.get("breakMinutes") ?? 60),
    graceMinutes: Number(formData.get("graceMinutes") ?? 5),
    ndStartTime: String(formData.get("ndStartTime") ?? "22:00"),
    ndEndTime: String(formData.get("ndEndTime") ?? "06:00"),
  };
  if (id) {
    await prisma.schedule.update({ where: { id }, data });
  } else {
    await prisma.schedule.create({ data: { ...data, companyId: user.companyId } });
  }
  revalidatePath("/schedules");
}

export async function assignScheduleAction(formData: FormData) {
  await requireUser(["HR", "ADMIN"]);
  await prisma.scheduleAssignment.create({
    data: {
      employeeId: String(formData.get("employeeId")),
      scheduleId: String(formData.get("scheduleId")),
      effectiveFrom: new Date(String(formData.get("effectiveFrom"))),
      effectiveTo: formData.get("effectiveTo")
        ? new Date(String(formData.get("effectiveTo")))
        : null,
    },
  });
  revalidatePath("/schedules");
  revalidatePath("/employees");
}

export async function upsertDepartmentAction(formData: FormData) {
  const user = await requireUser(["HR", "ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Department name is required");

  if (id) {
    const existing = await prisma.department.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) throw new Error("Department not found");
    await prisma.department.update({ where: { id }, data: { name } });
  } else {
    await prisma.department.create({
      data: { name, companyId: user.companyId },
    });
  }
  revalidatePath("/departments");
  revalidatePath("/employees");
}

export async function deleteDepartmentAction(formData: FormData) {
  const user = await requireUser(["HR", "ADMIN"]);
  const id = String(formData.get("id"));
  const dept = await prisma.department.findFirst({
    where: { id, companyId: user.companyId },
    include: { _count: { select: { employees: true } } },
  });
  if (!dept) throw new Error("Department not found");
  if (dept._count.employees > 0) {
    throw new Error("Cannot delete a department that still has employees assigned");
  }
  await prisma.department.delete({ where: { id } });
  revalidatePath("/departments");
  revalidatePath("/employees");
}

export async function upsertHolidayAction(formData: FormData) {
  const user = await requireUser(["HR", "ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const data = {
    date: new Date(String(formData.get("date"))),
    name: String(formData.get("name")),
    type: String(formData.get("type") ?? "LEGAL") as HolidayType,
  };
  if (id) {
    await prisma.holiday.update({ where: { id }, data });
  } else {
    await prisma.holiday.create({ data: { ...data, companyId: user.companyId } });
  }
  revalidatePath("/holidays");
}

export async function deleteHolidayAction(formData: FormData) {
  await requireUser(["HR", "ADMIN"]);
  await prisma.holiday.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/holidays");
}

export async function updateCompanyAction(formData: FormData) {
  const user = await requireUser(["ADMIN", "HR"]);
  const kioskAllowedIps = String(formData.get("kioskAllowedIps") ?? "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  await prisma.company.update({
    where: { id: user.companyId },
    data: {
      name: String(formData.get("name")),
      tin: String(formData.get("tin") || "") || null,
      sssEmployerNo: String(formData.get("sssEmployerNo") || "") || null,
      philhealthEmployerNo: String(formData.get("philhealthEmployerNo") || "") || null,
      pagibigEmployerNo: String(formData.get("pagibigEmployerNo") || "") || null,
      cutoffPattern: String(formData.get("cutoffPattern") ?? "SEMI_MONTHLY") as CutoffPattern,
      requireGeo: formData.get("requireGeo") === "on",
      requireIp: formData.get("requireIp") === "on",
      kioskEnabled: formData.get("kioskEnabled") === "on",
      kioskAllowedIps,
    },
  });
  await writeAudit({
    companyId: user.companyId,
    actorId: user.id,
    action: "COMPANY_UPDATE",
    entityType: "Company",
    entityId: user.companyId,
  });
  revalidatePath("/company");
}
