import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { manilaDayOfWeek, manilaTimeOnDate } from "../lib/manila";
import { createOrRecalculatePayrollRun, finalizePayrollRun } from "../domain/payroll";

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
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: "Devden Demo Corp",
      tin: "000-000-000-000",
      sssEmployerNo: "00-0000000-0",
      philhealthEmployerNo: "00-000000000-0",
      pagibigEmployerNo: "0000-0000-0000",
      cutoffPattern: "SEMI_MONTHLY",
      kioskEnabled: true,
      kioskAllowedIps: ["127.0.0.1", "::1"],
    },
  });

  const [opsDept, hrDept, financeDept, engDept, supportDept] = await Promise.all([
    prisma.department.create({ data: { companyId: company.id, name: "Operations" } }),
    prisma.department.create({ data: { companyId: company.id, name: "HR" } }),
    prisma.department.create({ data: { companyId: company.id, name: "Finance" } }),
    prisma.department.create({ data: { companyId: company.id, name: "Engineering" } }),
    prisma.department.create({ data: { companyId: company.id, name: "Support" } }),
  ]);

  const [officeSchedule, nightSchedule, dailySchedule] = await Promise.all([
    prisma.schedule.create({
      data: {
        companyId: company.id,
        name: "Standard Office",
        workdays: [1, 2, 3, 4, 5],
        startTime: "09:00",
        endTime: "18:00",
        breakMinutes: 60,
        graceMinutes: 5,
        restDays: [0, 6],
      },
    }),
    prisma.schedule.create({
      data: {
        companyId: company.id,
        name: "Night Shift",
        workdays: [1, 2, 3, 4, 5],
        startTime: "22:00",
        endTime: "06:00",
        breakMinutes: 60,
        graceMinutes: 5,
        restDays: [0, 6],
        ndStartTime: "22:00",
        ndEndTime: "06:00",
      },
    }),
    prisma.schedule.create({
      data: {
        companyId: company.id,
        name: "Daily Crew",
        workdays: [1, 2, 3, 4, 5, 6],
        startTime: "08:00",
        endTime: "17:00",
        breakMinutes: 60,
        graceMinutes: 5,
        restDays: [0],
      },
    }),
  ]);

  const passwordHash = await bcrypt.hash("password123", 10);

  const adminEmp = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNo: "E001",
      badgeCode: "BADGE-E001",
      firstName: "Alex",
      lastName: "Admin",
      hireDate: new Date("2024-01-01"),
      payType: "MONTHLY",
      basicRateCentavos: 5000000, // ₱50,000
      tin: "111-111-111-111",
      sssNumber: "01-1111111-1",
      philhealthNumber: "01-111111111-1",
      pagibigNumber: "1111-1111-1111",
      departmentId: opsDept.id,
    },
  });

  const hrEmp = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNo: "E002",
      badgeCode: "BADGE-E002",
      firstName: "Hanna",
      lastName: "HR",
      hireDate: new Date("2024-01-01"),
      payType: "MONTHLY",
      basicRateCentavos: 4000000, // ₱40,000
      tin: "222-222-222-222",
      sssNumber: "02-2222222-2",
      philhealthNumber: "02-222222222-2",
      pagibigNumber: "2222-2222-2222",
      departmentId: hrDept.id,
    },
  });

  const staffEmp = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNo: "E003",
      badgeCode: "BADGE-E003",
      firstName: "Sam",
      lastName: "Staff",
      hireDate: new Date("2024-06-01"),
      payType: "MONTHLY",
      basicRateCentavos: 2500000, // ₱25,000
      tin: "333-333-333-333",
      sssNumber: "03-3333333-3",
      philhealthNumber: "03-333333333-3",
      pagibigNumber: "3333-3333-3333",
      departmentId: supportDept.id,
      managerId: adminEmp.id,
    },
  });

  const financeEmp = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNo: "E004",
      badgeCode: "BADGE-E004",
      firstName: "Fay",
      lastName: "Finance",
      hireDate: new Date("2024-02-01"),
      payType: "MONTHLY",
      basicRateCentavos: 4500000, // ₱45,000
      tin: "444-444-444-444",
      sssNumber: "04-4444444-4",
      philhealthNumber: "04-444444444-4",
      pagibigNumber: "4444-4444-4444",
      departmentId: financeDept.id,
    },
  });

  const managerEmp = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNo: "E005",
      badgeCode: "BADGE-E005",
      firstName: "Mia",
      lastName: "Manager",
      hireDate: new Date("2024-01-15"),
      payType: "MONTHLY",
      basicRateCentavos: 5500000, // ₱55,000
      tin: "555-555-555-555",
      sssNumber: "05-5555555-5",
      philhealthNumber: "05-555555555-5",
      pagibigNumber: "5555-5555-5555",
      departmentId: engDept.id,
    },
  });

  const dailyEmp = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNo: "E006",
      badgeCode: "BADGE-E006",
      firstName: "Dan",
      lastName: "Daily",
      hireDate: new Date("2024-03-01"),
      payType: "DAILY",
      basicRateCentavos: 80000, // ₱800/day
      tin: "666-666-666-666",
      sssNumber: "06-6666666-6",
      philhealthNumber: "06-666666666-6",
      pagibigNumber: "6666-6666-6666",
      departmentId: opsDept.id,
      managerId: adminEmp.id,
    },
  });

  const hourlyEmp = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNo: "E007",
      badgeCode: "BADGE-E007",
      firstName: "Holly",
      lastName: "Hourly",
      hireDate: new Date("2024-04-01"),
      payType: "HOURLY",
      basicRateCentavos: 15000, // ₱150/hr
      tin: "777-777-777-777",
      sssNumber: "07-7777777-7",
      philhealthNumber: "07-777777777-7",
      pagibigNumber: "7777-7777-7777",
      departmentId: supportDept.id,
      managerId: managerEmp.id,
    },
  });

  await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNo: "E008",
      badgeCode: "BADGE-E008",
      firstName: "Sue",
      lastName: "Separated",
      hireDate: new Date("2023-01-01"),
      endDate: new Date("2025-12-31"),
      status: "SEPARATED",
      payType: "MONTHLY",
      basicRateCentavos: 2000000, // ₱20,000
      tin: "888-888-888-888",
      sssNumber: "08-8888888-8",
      philhealthNumber: "08-888888888-8",
      pagibigNumber: "8888-8888-8888",
      departmentId: supportDept.id,
    },
  });

  const officeEmployees = [
    { emp: adminEmp, from: "2024-01-01" },
    { emp: hrEmp, from: "2024-01-01" },
    { emp: staffEmp, from: "2024-06-01" },
    { emp: financeEmp, from: "2024-02-01" },
    { emp: managerEmp, from: "2024-01-15" },
  ];
  for (const { emp, from } of officeEmployees) {
    await prisma.scheduleAssignment.create({
      data: {
        employeeId: emp.id,
        scheduleId: officeSchedule.id,
        effectiveFrom: new Date(from),
      },
    });
  }

  await prisma.scheduleAssignment.create({
    data: {
      employeeId: dailyEmp.id,
      scheduleId: dailySchedule.id,
      effectiveFrom: new Date("2024-03-01"),
    },
  });

  await prisma.scheduleAssignment.create({
    data: {
      employeeId: hourlyEmp.id,
      scheduleId: nightSchedule.id,
      effectiveFrom: new Date("2024-04-01"),
    },
  });

  const adminUser = await prisma.user.create({
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
      employeeId: financeEmp.id,
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
      name: "Mia Manager",
      passwordHash,
      role: "MANAGER",
      companyId: company.id,
      employeeId: managerEmp.id,
    },
  });

  // Illustrative SSS MSC ladder (NOT official — verify before production)
  await prisma.contributionTable.create({
    data: {
      companyId: company.id,
      type: "SSS",
      effectiveFrom: new Date("2025-01-01"),
      bracketsJson: [
        { minCentavos: 0, maxCentavos: 424999, eeCentavos: 18000, erCentavos: 39000 },
        { minCentavos: 425000, maxCentavos: 474999, eeCentavos: 20250, erCentavos: 43875 },
        { minCentavos: 475000, maxCentavos: 524999, eeCentavos: 22500, erCentavos: 48750 },
        { minCentavos: 525000, maxCentavos: 574999, eeCentavos: 24750, erCentavos: 53625 },
        { minCentavos: 575000, maxCentavos: 624999, eeCentavos: 27000, erCentavos: 58500 },
        { minCentavos: 625000, maxCentavos: 674999, eeCentavos: 29250, erCentavos: 63375 },
        { minCentavos: 675000, maxCentavos: 724999, eeCentavos: 31500, erCentavos: 68250 },
        { minCentavos: 725000, maxCentavos: 774999, eeCentavos: 33750, erCentavos: 73125 },
        { minCentavos: 775000, maxCentavos: 824999, eeCentavos: 36000, erCentavos: 78000 },
        { minCentavos: 825000, maxCentavos: 874999, eeCentavos: 38250, erCentavos: 82875 },
        { minCentavos: 875000, maxCentavos: 924999, eeCentavos: 40500, erCentavos: 87750 },
        { minCentavos: 925000, maxCentavos: 974999, eeCentavos: 42750, erCentavos: 92625 },
        { minCentavos: 975000, maxCentavos: 1024999, eeCentavos: 45000, erCentavos: 97500 },
        { minCentavos: 1025000, maxCentavos: 1074999, eeCentavos: 47250, erCentavos: 102375 },
        { minCentavos: 1075000, maxCentavos: 1124999, eeCentavos: 49500, erCentavos: 107250 },
        { minCentavos: 1125000, maxCentavos: 1174999, eeCentavos: 51750, erCentavos: 112125 },
        { minCentavos: 1175000, maxCentavos: 1224999, eeCentavos: 54000, erCentavos: 117000 },
        { minCentavos: 1225000, maxCentavos: 1274999, eeCentavos: 56250, erCentavos: 121875 },
        { minCentavos: 1275000, maxCentavos: 1324999, eeCentavos: 58500, erCentavos: 126750 },
        { minCentavos: 1325000, maxCentavos: 1374999, eeCentavos: 60750, erCentavos: 131625 },
        { minCentavos: 1375000, maxCentavos: 1424999, eeCentavos: 63000, erCentavos: 136500 },
        { minCentavos: 1425000, maxCentavos: 1474999, eeCentavos: 65250, erCentavos: 141375 },
        { minCentavos: 1475000, maxCentavos: 1524999, eeCentavos: 67500, erCentavos: 146250 },
        { minCentavos: 1525000, maxCentavos: 1574999, eeCentavos: 69750, erCentavos: 151125 },
        { minCentavos: 1575000, maxCentavos: 1624999, eeCentavos: 72000, erCentavos: 156000 },
        { minCentavos: 1625000, maxCentavos: 1674999, eeCentavos: 74250, erCentavos: 160875 },
        { minCentavos: 1675000, maxCentavos: 1724999, eeCentavos: 76500, erCentavos: 165750 },
        { minCentavos: 1725000, maxCentavos: 1774999, eeCentavos: 78750, erCentavos: 170625 },
        { minCentavos: 1775000, maxCentavos: 1824999, eeCentavos: 81000, erCentavos: 175500 },
        { minCentavos: 1825000, maxCentavos: 1874999, eeCentavos: 83250, erCentavos: 180375 },
        { minCentavos: 1875000, maxCentavos: 1924999, eeCentavos: 85500, erCentavos: 185250 },
        { minCentavos: 1925000, maxCentavos: 1974999, eeCentavos: 87750, erCentavos: 190125 },
        { minCentavos: 1975000, maxCentavos: 999999999, eeCentavos: 90000, erCentavos: 195000 },
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

  // Illustrative TRAIN-style semi-monthly brackets (verify with BIR)
  await prisma.taxTable.create({
    data: {
      companyId: company.id,
      name: "Illustrative TRAIN semi-monthly (period taxable)",
      effectiveFrom: new Date("2025-01-01"),
      bracketsJson: [
        { minCentavos: 0, maxCentavos: 1041650, baseTaxCentavos: 0, rateOverMin: 0 },
        { minCentavos: 1041651, maxCentavos: 1666670, baseTaxCentavos: 0, rateOverMin: 0.15 },
        { minCentavos: 1666671, maxCentavos: 3333330, baseTaxCentavos: 93750, rateOverMin: 0.2 },
        { minCentavos: 3333331, maxCentavos: 8333330, baseTaxCentavos: 427085, rateOverMin: 0.25 },
        { minCentavos: 8333331, maxCentavos: 20833330, baseTaxCentavos: 1677085, rateOverMin: 0.3 },
        { minCentavos: 20833331, maxCentavos: null, baseTaxCentavos: 5417085, rateOverMin: 0.35 },
      ],
    },
  });

  // Illustrative 2026 PH holiday calendar (not an official proclamation list)
  const holidays: { date: string; name: string; type: "LEGAL" | "SPECIAL" | "COMPANY" }[] = [
    { date: "2026-01-01", name: "New Year's Day", type: "LEGAL" },
    { date: "2026-02-17", name: "Chinese New Year", type: "SPECIAL" },
    { date: "2026-02-25", name: "EDSA People Power Revolution Anniversary", type: "SPECIAL" },
    { date: "2026-03-16", name: "Founders Day", type: "COMPANY" },
    { date: "2026-04-02", name: "Maundy Thursday", type: "LEGAL" },
    { date: "2026-04-03", name: "Good Friday", type: "LEGAL" },
    { date: "2026-04-04", name: "Black Saturday", type: "SPECIAL" },
    { date: "2026-04-09", name: "Araw ng Kagitingan", type: "LEGAL" },
    { date: "2026-05-01", name: "Labor Day", type: "LEGAL" },
    { date: "2026-06-12", name: "Independence Day", type: "LEGAL" },
    { date: "2026-08-21", name: "Ninoy Aquino Day", type: "SPECIAL" },
    { date: "2026-08-31", name: "National Heroes Day", type: "LEGAL" },
    { date: "2026-11-01", name: "All Saints' Day", type: "SPECIAL" },
    { date: "2026-11-30", name: "Bonifacio Day", type: "LEGAL" },
    { date: "2026-12-08", name: "Feast of the Immaculate Conception", type: "SPECIAL" },
    { date: "2026-12-24", name: "Christmas Eve", type: "SPECIAL" },
    { date: "2026-12-25", name: "Christmas Day", type: "LEGAL" },
    { date: "2026-12-30", name: "Rizal Day", type: "LEGAL" },
    { date: "2026-12-31", name: "Last Day of the Year", type: "SPECIAL" },
  ];

  for (const h of holidays) {
    await prisma.holiday.create({
      data: {
        companyId: company.id,
        date: new Date(h.date),
        name: h.name,
        type: h.type,
      },
    });
  }

  // --- Two months of demo attendance + finalized semi-monthly payroll (Jun–Jul 2026) ---
  const holidayByDate = new Map(holidays.map((h) => [h.date, h.type]));

  type SeedWorker = {
    emp: typeof adminEmp;
    schedule: typeof officeSchedule;
    overnight: boolean;
  };

  const workers: SeedWorker[] = [
    { emp: adminEmp, schedule: officeSchedule, overnight: false },
    { emp: hrEmp, schedule: officeSchedule, overnight: false },
    { emp: staffEmp, schedule: officeSchedule, overnight: false },
    { emp: financeEmp, schedule: officeSchedule, overnight: false },
    { emp: managerEmp, schedule: officeSchedule, overnight: false },
    { emp: dailyEmp, schedule: dailySchedule, overnight: false },
    { emp: hourlyEmp, schedule: nightSchedule, overnight: true },
  ];

  function dateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  function addDaysUtc(dateOnly: Date, days: number): Date {
    const next = new Date(dateOnly);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  function eachDateInclusive(start: string, end: string): Date[] {
    const out: Date[] = [];
    let cur = new Date(start);
    const last = new Date(end);
    while (cur <= last) {
      out.push(new Date(cur));
      cur = addDaysUtc(cur, 1);
    }
    return out;
  }

  /** Stable 0–99 pseudo-random from employee + date for variety */
  function roll(employeeNo: string, day: string): number {
    let h = 0;
    const s = `${employeeNo}:${day}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 100;
  }

  const attendanceRows: {
    employeeId: string;
    punchType: "IN" | "OUT";
    punchedAt: Date;
    manilaDate: Date;
    source: "CLOCK";
  }[] = [];
  const timesheetRows: {
    employeeId: string;
    manilaDate: Date;
    regularMinutes: number;
    otMinutes: number;
    lateMinutes: number;
    undertimeMinutes: number;
    ndMinutes: number;
    dayType: string;
    isAdjusted: boolean;
  }[] = [];

  const demoStart = "2026-06-01";
  const demoEnd = "2026-07-31";

  for (const { emp, schedule, overnight } of workers) {
    for (const day of eachDateInclusive(demoStart, demoEnd)) {
      const ds = dateStr(day);
      const dow = manilaDayOfWeek(day);
      const holidayType = holidayByDate.get(ds);
      const isRest =
        schedule.restDays.includes(dow) || !schedule.workdays.includes(dow);

      let dayType = "REGULAR";
      if (holidayType === "LEGAL") dayType = "LEGAL";
      else if (holidayType === "SPECIAL") dayType = "SPECIAL";
      else if (holidayType === "COMPANY") dayType = "COMPANY";
      else if (isRest) dayType = "REST";

      const expectedMinutes = 480; // 8h after break for all seeded schedules
      const r = roll(emp.employeeNo, ds);

      // Unworked legal holiday still needs a timesheet row for holiday pay
      if (dayType === "LEGAL") {
        timesheetRows.push({
          employeeId: emp.id,
          manilaDate: day,
          regularMinutes: 0,
          otMinutes: 0,
          lateMinutes: 0,
          undertimeMinutes: 0,
          ndMinutes: 0,
          dayType: "LEGAL",
          isAdjusted: true,
        });
        continue;
      }

      if (dayType !== "REGULAR") continue;

      // Occasional absence (more for daily/hourly)
      const absentThreshold = emp.payType === "MONTHLY" ? 3 : 8;
      if (r < absentThreshold) continue;

      const late = r >= 85 && r < 93;
      const undertime = r >= 93 && r < 97;
      const ot = r >= 97;
      const lateMinutes = late ? 15 + (r % 20) : 0;
      const undertimeMinutes = undertime ? 20 + (r % 25) : 0;
      const otMinutes = ot ? 60 + (r % 60) : 0;
      const regularMinutes = Math.max(
        0,
        expectedMinutes - lateMinutes - undertimeMinutes
      );
      const ndMinutes = overnight ? Math.min(regularMinutes + otMinutes, 360) : 0;

      timesheetRows.push({
        employeeId: emp.id,
        manilaDate: day,
        regularMinutes,
        otMinutes,
        lateMinutes,
        undertimeMinutes,
        ndMinutes,
        dayType: "REGULAR",
        isAdjusted: true,
      });

      // Matching punches (day shift same calendar day; night shift spans midnight)
      const inOffset = lateMinutes;
      const outExtra = otMinutes - undertimeMinutes;
      if (overnight) {
        const inAt = manilaTimeOnDate(ds, schedule.startTime);
        inAt.setUTCMinutes(inAt.getUTCMinutes() + inOffset);
        const nextDs = dateStr(addDaysUtc(day, 1));
        const outAt = manilaTimeOnDate(nextDs, schedule.endTime);
        outAt.setUTCMinutes(outAt.getUTCMinutes() + outExtra);
        attendanceRows.push(
          {
            employeeId: emp.id,
            punchType: "IN",
            punchedAt: inAt,
            manilaDate: day,
            source: "CLOCK",
          },
          {
            employeeId: emp.id,
            punchType: "OUT",
            punchedAt: outAt,
            manilaDate: addDaysUtc(day, 1),
            source: "CLOCK",
          }
        );
      } else {
        const inAt = manilaTimeOnDate(ds, schedule.startTime);
        inAt.setUTCMinutes(inAt.getUTCMinutes() + inOffset);
        const outAt = manilaTimeOnDate(ds, schedule.endTime);
        outAt.setUTCMinutes(outAt.getUTCMinutes() + outExtra);
        attendanceRows.push(
          {
            employeeId: emp.id,
            punchType: "IN",
            punchedAt: inAt,
            manilaDate: day,
            source: "CLOCK",
          },
          {
            employeeId: emp.id,
            punchType: "OUT",
            punchedAt: outAt,
            manilaDate: day,
            source: "CLOCK",
          }
        );
      }
    }
  }

  // Insert in chunks to avoid oversized payloads
  const chunk = 500;
  for (let i = 0; i < attendanceRows.length; i += chunk) {
    await prisma.attendanceLog.createMany({ data: attendanceRows.slice(i, i + chunk) });
  }
  for (let i = 0; i < timesheetRows.length; i += chunk) {
    await prisma.timesheetDay.createMany({ data: timesheetRows.slice(i, i + chunk) });
  }

  const periodDefs = [
    { start: "2026-06-01", end: "2026-06-15", pay: "2026-06-20" },
    { start: "2026-06-16", end: "2026-06-30", pay: "2026-07-05" },
    { start: "2026-07-01", end: "2026-07-15", pay: "2026-07-20" },
    { start: "2026-07-16", end: "2026-07-31", pay: "2026-08-05" },
  ];

  for (const p of periodDefs) {
    const period = await prisma.payrollPeriod.create({
      data: {
        companyId: company.id,
        startDate: new Date(p.start),
        endDate: new Date(p.end),
        payDate: new Date(p.pay),
        status: "LOCKED",
      },
    });
    const run = await createOrRecalculatePayrollRun(period.id);
    await finalizePayrollRun(run.id, adminUser.id);
  }

  console.log("Seed complete.");
  console.log("Company: Devden Demo Corp — 5 depts, 3 schedules, 8 employees, 19 holidays");
  console.log(
    `Demo payroll: Jun–Jul 2026 — ${periodDefs.length} finalized semi-monthly runs, ` +
      `${timesheetRows.length} timesheet days, ${attendanceRows.length} punches`
  );
  console.log("Logins (password: password123):");
  console.log("  admin@demo.local / hr@demo.local / finance@demo.local / staff@demo.local / manager@demo.local");
  console.log("Kiosk: /kiosk (127.0.0.1 / ::1); badges BADGE-E001 … BADGE-E007 (E008 separated)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
