import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrollItem.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.missedPunchRequest.deleteMany();
  await prisma.timesheetDay.deleteMany();
  await prisma.attendanceLog.deleteMany();
  await prisma.scheduleAssignment.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.contributionTable.deleteMany();
  await prisma.taxTable.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: "Devden Demo Corp",
      tin: "000-000-000-000",
      sssEmployerNo: "00-0000000-0",
      philhealthEmployerNo: "00-000000000-0",
      pagibigEmployerNo: "0000-0000-0000",
      cutoffPattern: "SEMI_MONTHLY",
    },
  });

  const schedule = await prisma.schedule.create({
    data: {
      companyId: company.id,
      name: "Standard Mon-Fri 9-6",
      workdays: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "18:00",
      breakMinutes: 60,
      graceMinutes: 5,
      restDays: [0, 6],
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  const adminEmp = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNo: "E001",
      fullName: "Alex Admin",
      hireDate: new Date("2024-01-01"),
      payType: "MONTHLY",
      basicRateCentavos: 5000000, // 50,000 PHP
      tin: "111-111-111-111",
      sssNumber: "01-1111111-1",
      philhealthNumber: "01-111111111-1",
      pagibigNumber: "1111-1111-1111",
      department: "Operations",
    },
  });

  const hrEmp = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNo: "E002",
      fullName: "Hanna HR",
      hireDate: new Date("2024-01-01"),
      payType: "MONTHLY",
      basicRateCentavos: 4000000,
      tin: "222-222-222-222",
      sssNumber: "02-2222222-2",
      philhealthNumber: "02-222222222-2",
      pagibigNumber: "2222-2222-2222",
      department: "HR",
    },
  });

  const staffEmp = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNo: "E003",
      fullName: "Sam Staff",
      hireDate: new Date("2024-06-01"),
      payType: "MONTHLY",
      basicRateCentavos: 2500000,
      tin: "333-333-333-333",
      sssNumber: "03-3333333-3",
      philhealthNumber: "03-333333333-3",
      pagibigNumber: "3333-3333-3333",
      department: "Support",
      managerId: adminEmp.id,
    },
  });

  for (const emp of [adminEmp, hrEmp, staffEmp]) {
    await prisma.scheduleAssignment.create({
      data: {
        employeeId: emp.id,
        scheduleId: schedule.id,
        effectiveFrom: new Date("2024-01-01"),
      },
    });
  }

  const usersNote = true;
  void usersNote;

  await prisma.user.create({
    data: {
      email: "admin@demo.local",
      name: "Alex Admin",
      passwordHash,
      role: "ADMIN",
      companyId: company.id,
      employeeId: adminEmp.id,
    },
  });
  await prisma.user.create({
    data: {
      email: "hr@demo.local",
      name: "Hanna HR",
      passwordHash,
      role: "HR",
      companyId: company.id,
      employeeId: hrEmp.id,
    },
  });
  await prisma.user.create({
    data: {
      email: "finance@demo.local",
      name: "Fay Finance",
      passwordHash,
      role: "FINANCE",
      companyId: company.id,
      employeeId: null,
    },
  });
  await prisma.user.create({
    data: {
      email: "staff@demo.local",
      name: "Sam Staff",
      passwordHash,
      role: "EMPLOYEE",
      companyId: company.id,
      employeeId: staffEmp.id,
    },
  });
  await prisma.user.create({
    data: {
      email: "manager@demo.local",
      name: "Alex Manager",
      passwordHash,
      role: "MANAGER",
      companyId: company.id,
      employeeId: null,
    },
  });

  // Illustrative SSS brackets (NOT official — verify before production)
  await prisma.contributionTable.create({
    data: {
      companyId: company.id,
      type: "SSS",
      effectiveFrom: new Date("2025-01-01"),
      bracketsJson: [
        { minCentavos: 0, maxCentavos: 524999, eeCentavos: 25000, erCentavos: 50000 },
        { minCentavos: 525000, maxCentavos: 574999, eeCentavos: 27500, erCentavos: 55000 },
        { minCentavos: 575000, maxCentavos: 624999, eeCentavos: 30000, erCentavos: 60000 },
        { minCentavos: 625000, maxCentavos: 999999999, eeCentavos: 45000, erCentavos: 90000 },
      ],
    },
  });

  await prisma.contributionTable.create({
    data: {
      companyId: company.id,
      type: "PHILHEALTH",
      effectiveFrom: new Date("2025-01-01"),
      bracketsJson: {
        eeRate: 0.025,
        erRate: 0.025,
        minBaseCentavos: 1000000,
        maxBaseCentavos: 10000000,
      },
    },
  });

  await prisma.contributionTable.create({
    data: {
      companyId: company.id,
      type: "PAGIBIG",
      effectiveFrom: new Date("2025-01-01"),
      bracketsJson: {
        eeRate: 0.02,
        erRate: 0.02,
        maxEeCentavos: 10000,
      },
    },
  });

  // Illustrative semi-monthly withholding-style brackets (verify with BIR)
  await prisma.taxTable.create({
    data: {
      companyId: company.id,
      name: "Illustrative TRAIN semi-monthly",
      effectiveFrom: new Date("2025-01-01"),
      bracketsJson: [
        { minCentavos: 0, maxCentavos: 1041650, baseTaxCentavos: 0, rateOverMin: 0 },
        { minCentavos: 1041651, maxCentavos: 1666670, baseTaxCentavos: 0, rateOverMin: 0.15 },
        { minCentavos: 1666671, maxCentavos: 3333330, baseTaxCentavos: 93750, rateOverMin: 0.2 },
        { minCentavos: 3333331, maxCentavos: 8333330, baseTaxCentavos: 427085, rateOverMin: 0.25 },
        { minCentavos: 8333331, maxCentavos: null, baseTaxCentavos: 1677085, rateOverMin: 0.3 },
      ],
    },
  });

  await prisma.holiday.create({
    data: {
      companyId: company.id,
      date: new Date("2026-01-01"),
      name: "New Year's Day",
      type: "LEGAL",
    },
  });

  console.log("Seed complete.");
  console.log("Logins (password: password123):");
  console.log("  admin@demo.local / hr@demo.local / finance@demo.local / staff@demo.local / manager@demo.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
