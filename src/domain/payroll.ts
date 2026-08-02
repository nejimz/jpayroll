import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import type { ContributionTable, PayType, TaxTable, TimesheetDay } from "@prisma/client";

type SssBracket = {
  minCentavos: number;
  maxCentavos: number;
  eeCentavos: number;
  erCentavos: number;
};

type PercentTable = {
  eeRate: number; // e.g. 0.05 for 5% shared half
  erRate: number;
  minBaseCentavos?: number;
  maxBaseCentavos?: number;
  minEeCentavos?: number;
  maxEeCentavos?: number;
};

type TaxBracket = {
  minCentavos: number;
  maxCentavos: number | null;
  baseTaxCentavos: number;
  rateOverMin: number; // e.g. 0.20
};

function hourlyRateCentavos(basicRateCentavos: number, payType: PayType): number {
  // Assumptions: monthly = 22 days * 8 hrs; daily = 8 hrs
  if (payType === "HOURLY") return basicRateCentavos;
  if (payType === "DAILY") return Math.round(basicRateCentavos / 8);
  return Math.round(basicRateCentavos / (22 * 8));
}

function dailyRateCentavos(basicRateCentavos: number, payType: PayType): number {
  if (payType === "DAILY") return basicRateCentavos;
  if (payType === "HOURLY") return basicRateCentavos * 8;
  return Math.round(basicRateCentavos / 22);
}

function premiumMultiplier(dayType: string, kind: "regular" | "ot"): number {
  // Ordinary day OT +25%; rest +30% base / OT higher; legal holiday 200%; special 130%
  if (dayType === "LEGAL") return kind === "ot" ? 2.6 : 2.0;
  if (dayType === "SPECIAL") return kind === "ot" ? 1.69 : 1.3;
  if (dayType === "REST") return kind === "ot" ? 1.69 : 1.3;
  return kind === "ot" ? 1.25 : 1.0;
}

function lookupSss(table: ContributionTable, monthlyCompCentavos: number): {
  ee: number;
  er: number;
} {
  const brackets = table.bracketsJson as SssBracket[];
  const b =
    brackets.find(
      (x) => monthlyCompCentavos >= x.minCentavos && monthlyCompCentavos <= x.maxCentavos
    ) ?? brackets[brackets.length - 1];
  return { ee: b.eeCentavos, er: b.erCentavos };
}

function lookupPercent(
  table: ContributionTable,
  monthlyCompCentavos: number
): { ee: number; er: number } {
  const cfg = table.bracketsJson as PercentTable;
  let base = monthlyCompCentavos;
  if (cfg.minBaseCentavos != null) base = Math.max(base, cfg.minBaseCentavos);
  if (cfg.maxBaseCentavos != null) base = Math.min(base, cfg.maxBaseCentavos);
  let ee = Math.round(base * cfg.eeRate);
  let er = Math.round(base * cfg.erRate);
  if (cfg.minEeCentavos != null) ee = Math.max(ee, cfg.minEeCentavos);
  if (cfg.maxEeCentavos != null) ee = Math.min(ee, cfg.maxEeCentavos);
  return { ee, er };
}

function computeWithholding(table: TaxTable, taxablePeriodCentavos: number): number {
  // Semi-monthly approximation: brackets stored as monthly; half for semi-monthly periods
  const brackets = table.bracketsJson as TaxBracket[];
  const b =
    brackets.find(
      (x) =>
        taxablePeriodCentavos >= x.minCentavos &&
        (x.maxCentavos == null || taxablePeriodCentavos <= x.maxCentavos)
    ) ?? brackets[brackets.length - 1];
  const over = Math.max(0, taxablePeriodCentavos - b.minCentavos);
  return Math.round(b.baseTaxCentavos + over * b.rateOverMin);
}

async function effectiveTable(
  companyId: string,
  type: "SSS" | "PHILHEALTH" | "PAGIBIG",
  onDate: Date
) {
  return prisma.contributionTable.findFirst({
    where: {
      companyId,
      type,
      effectiveFrom: { lte: onDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: onDate } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
}

async function effectiveTax(companyId: string, onDate: Date) {
  return prisma.taxTable.findFirst({
    where: {
      companyId,
      effectiveFrom: { lte: onDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: onDate } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
}

function hashTimesheets(days: TimesheetDay[]): string {
  const payload = days
    .map(
      (d) =>
        `${d.employeeId}|${d.manilaDate.toISOString()}|${d.regularMinutes}|${d.otMinutes}|${d.ndMinutes}|${d.lateMinutes}|${d.undertimeMinutes}|${d.dayType}`
    )
    .sort()
    .join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

export async function createOrRecalculatePayrollRun(periodId: string) {
  const period = await prisma.payrollPeriod.findUniqueOrThrow({
    where: { id: periodId },
    include: { company: true },
  });

  if (!["LOCKED", "DRAFT_PAYROLL"].includes(period.status)) {
    throw new Error("Period must be locked before running payroll");
  }

  const onDate = period.endDate;
  const [sssTable, phTable, pagTable, taxTable] = await Promise.all([
    effectiveTable(period.companyId, "SSS", onDate),
    effectiveTable(period.companyId, "PHILHEALTH", onDate),
    effectiveTable(period.companyId, "PAGIBIG", onDate),
    effectiveTax(period.companyId, onDate),
  ]);

  if (!sssTable || !phTable || !pagTable || !taxTable) {
    throw new Error("Missing contribution or tax tables for period end date");
  }

  const employees = await prisma.employee.findMany({
    where: {
      companyId: period.companyId,
      status: "ACTIVE",
      hireDate: { lte: period.endDate },
      OR: [{ endDate: null }, { endDate: { gte: period.startDate } }],
    },
  });

  const days = await prisma.timesheetDay.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      manilaDate: { gte: period.startDate, lte: period.endDate },
    },
  });

  const snapshotHash = hashTimesheets(days);

  let run = await prisma.payrollRun.findFirst({
    where: { periodId, status: "DRAFT" },
  });

  if (run) {
    await prisma.payrollItem.deleteMany({ where: { runId: run.id } });
    run = await prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        sssTableId: sssTable.id,
        philhealthTableId: phTable.id,
        pagibigTableId: pagTable.id,
        taxTableId: taxTable.id,
        timesheetSnapshotHash: snapshotHash,
      },
    });
  } else {
    run = await prisma.payrollRun.create({
      data: {
        periodId,
        status: "DRAFT",
        sssTableId: sssTable.id,
        philhealthTableId: phTable.id,
        pagibigTableId: pagTable.id,
        taxTableId: taxTable.id,
        timesheetSnapshotHash: snapshotHash,
      },
    });
  }

  for (const emp of employees) {
    const empDays = days.filter((d) => d.employeeId === emp.id);
    const hourly = hourlyRateCentavos(emp.basicRateCentavos, emp.payType);
    const daily = dailyRateCentavos(emp.basicRateCentavos, emp.payType);

    let regularPay = 0;
    let otPay = 0;
    let holidayPay = 0;
    let ndPay = 0;

    for (const day of empDays) {
      const ndRate = Math.round(hourly * 0.1);
      ndPay += Math.round((day.ndMinutes / 60) * ndRate);

      if (day.dayType === "REGULAR") {
        // Deduct late/undertime from regular
        const payableRegMin = Math.max(
          0,
          day.regularMinutes - day.lateMinutes - day.undertimeMinutes
        );
        regularPay += Math.round((payableRegMin / 60) * hourly);
        otPay += Math.round(
          (day.otMinutes / 60) * hourly * premiumMultiplier("REGULAR", "ot")
        );
      } else {
        // Premium day work counted via otMinutes field
        const mult = premiumMultiplier(day.dayType, "regular");
        const pay = Math.round((day.otMinutes / 60) * hourly * mult);
        if (day.dayType === "LEGAL" || day.dayType === "SPECIAL") holidayPay += pay;
        else otPay += pay;

        // Unworked regular holiday still pays daily rate for monthly/daily if LEGAL
        if (day.dayType === "LEGAL" && day.otMinutes === 0 && day.regularMinutes === 0) {
          holidayPay += daily;
        }
      }
    }

    // Monthly employees: if few timesheet days, still pay basic proportionally for period
    if (emp.payType === "MONTHLY") {
      // Semi-monthly default: half monthly rate as base, adjust by attendance factor lightly
      const periodBase = Math.round(emp.basicRateCentavos / 2);
      // Prefer attendance-derived regular; floor with periodBase if they have activity
      if (empDays.length > 0 && regularPay < periodBase * 0.5) {
        // keep attendance-based
      } else if (empDays.length === 0) {
        regularPay = periodBase;
      } else {
        // Blend: use max of computed regular vs scaled
        regularPay = Math.max(regularPay, Math.round(periodBase * 0.8));
      }
    }

    const gross = regularPay + otPay + holidayPay + ndPay;
    // Approximate monthly compensation for contributions: 2x period gross for semi-monthly
    const monthlyComp =
      period.company.cutoffPattern === "MONTHLY" ? gross : gross * 2;

    const sss = lookupSss(sssTable, monthlyComp);
    const ph = lookupPercent(phTable, monthlyComp);
    const pag = lookupPercent(pagTable, monthlyComp);

    // Semi-monthly: take half of monthly contributions
    const factor = period.company.cutoffPattern === "MONTHLY" ? 1 : 0.5;
    const sssEe = Math.round(sss.ee * factor);
    const sssEr = Math.round(sss.er * factor);
    const phEe = Math.round(ph.ee * factor);
    const phEr = Math.round(ph.er * factor);
    const pagEe = Math.round(pag.ee * factor);
    const pagEr = Math.round(pag.er * factor);

    const taxable = Math.max(0, gross - sssEe - phEe - pagEe);
    const tax = computeWithholding(taxTable, taxable);
    const net = Math.max(0, taxable - tax);

    await prisma.payrollItem.create({
      data: {
        runId: run.id,
        employeeId: emp.id,
        regularPayCentavos: regularPay,
        otPayCentavos: otPay,
        holidayPayCentavos: holidayPay,
        ndPayCentavos: ndPay,
        grossCentavos: gross,
        sssEeCentavos: sssEe,
        sssErCentavos: sssEr,
        philhealthEeCentavos: phEe,
        philhealthErCentavos: phEr,
        pagibigEeCentavos: pagEe,
        pagibigErCentavos: pagEr,
        taxableCentavos: taxable,
        taxCentavos: tax,
        netCentavos: net,
        detailJson: {
          days: empDays.length,
          monthlyCompEstimate: monthlyComp,
        },
      },
    });
  }

  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: { status: "DRAFT_PAYROLL" },
  });

  return run;
}

export async function finalizePayrollRun(runId: string, finalizedById: string) {
  const run = await prisma.payrollRun.findUniqueOrThrow({
    where: { id: runId },
    include: { items: true, period: true },
  });
  if (run.status === "FINALIZED") throw new Error("Already finalized");

  await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      status: "FINALIZED",
      finalizedAt: new Date(),
      finalizedById,
    },
  });

  await prisma.payrollPeriod.update({
    where: { id: run.periodId },
    data: { status: "FINALIZED" },
  });

  for (const item of run.items) {
    await prisma.payslip.upsert({
      where: { payrollItemId: item.id },
      create: { payrollItemId: item.id, pdfStorageKey: null },
      update: { publishedAt: new Date() },
    });
  }

  return run;
}
