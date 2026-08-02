"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { createOrRecalculatePayrollRun, finalizePayrollRun } from "@/domain/payroll";

export async function createPeriodAction(formData: FormData) {
  const user = await requireUser(["HR", "ADMIN"]);
  await prisma.payrollPeriod.create({
    data: {
      companyId: user.companyId,
      startDate: new Date(String(formData.get("startDate"))),
      endDate: new Date(String(formData.get("endDate"))),
      payDate: new Date(String(formData.get("payDate"))),
      status: "OPEN",
    },
  });
  revalidatePath("/periods");
}

export async function lockPeriodAction(formData: FormData) {
  const user = await requireUser(["HR", "ADMIN"]);
  const id = String(formData.get("id"));
  await prisma.payrollPeriod.update({
    where: { id },
    data: { status: "LOCKED" },
  });
  await writeAudit({
    companyId: user.companyId,
    actorId: user.id,
    action: "PERIOD_LOCK",
    entityType: "PayrollPeriod",
    entityId: id,
  });
  revalidatePath("/periods");
}

export async function runPayrollAction(formData: FormData) {
  await requireUser(["HR", "ADMIN"]);
  const periodId = String(formData.get("periodId"));
  const run = await createOrRecalculatePayrollRun(periodId);
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${run.id}`);
  redirect(`/payroll/${run.id}`);
}

export async function finalizePayrollAction(formData: FormData) {
  const user = await requireUser(["HR", "FINANCE", "ADMIN"]);
  const runId = String(formData.get("runId"));
  await finalizePayrollRun(runId, user.id);
  await writeAudit({
    companyId: user.companyId,
    actorId: user.id,
    action: "PAYROLL_FINALIZE",
    entityType: "PayrollRun",
    entityId: runId,
  });
  revalidatePath("/payroll");
  revalidatePath("/payslips");
}

export async function saveContributionTableAction(formData: FormData) {
  const user = await requireUser(["HR", "ADMIN"]);
  const type = String(formData.get("type")) as "SSS" | "PHILHEALTH" | "PAGIBIG";
  const bracketsJson = JSON.parse(String(formData.get("bracketsJson")));
  await prisma.contributionTable.create({
    data: {
      companyId: user.companyId,
      type,
      effectiveFrom: new Date(String(formData.get("effectiveFrom"))),
      effectiveTo: formData.get("effectiveTo")
        ? new Date(String(formData.get("effectiveTo")))
        : null,
      bracketsJson,
    },
  });
  revalidatePath("/tables");
}

export async function saveTaxTableAction(formData: FormData) {
  const user = await requireUser(["HR", "ADMIN"]);
  const bracketsJson = JSON.parse(String(formData.get("bracketsJson")));
  await prisma.taxTable.create({
    data: {
      companyId: user.companyId,
      name: String(formData.get("name")),
      effectiveFrom: new Date(String(formData.get("effectiveFrom"))),
      effectiveTo: formData.get("effectiveTo")
        ? new Date(String(formData.get("effectiveTo")))
        : null,
      bracketsJson,
    },
  });
  revalidatePath("/tables");
}
