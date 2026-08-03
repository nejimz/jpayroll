import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPhp } from "@/lib/money";
import { formatEmployeeName } from "@/lib/employee-name";
import { Card, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN", "FINANCE", "MANAGER"].includes(user.role)) redirect("/dashboard");

  const exceptions = await prisma.timesheetDay.findMany({
    where: {
      hasUnpairedPunch: true,
      employee: { companyId: user.companyId },
    },
    include: { employee: true },
    orderBy: { manilaDate: "desc" },
    take: 50,
  });

  const latestRun = await prisma.payrollRun.findFirst({
    where: { period: { companyId: user.companyId }, status: "FINALIZED" },
    include: { items: true, period: true },
    orderBy: { finalizedAt: "desc" },
  });

  const attendance = await prisma.attendanceLog.findMany({
    where: { employee: { companyId: user.companyId } },
    include: { employee: true },
    orderBy: { punchedAt: "desc" },
    take: 40,
  });

  const contrib = latestRun
    ? latestRun.items.reduce(
        (a, i) => {
          a.sssEe += i.sssEeCentavos;
          a.sssEr += i.sssErCentavos;
          a.phEe += i.philhealthEeCentavos;
          a.phEr += i.philhealthErCentavos;
          a.pagEe += i.pagibigEeCentavos;
          a.pagEr += i.pagibigErCentavos;
          return a;
        },
        { sssEe: 0, sssEr: 0, phEe: 0, phEr: 0, pagEe: 0, pagEr: 0 }
      )
    : null;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Attendance, exceptions, and contribution summary." />

      <Card className="mb-6">
        <h2 className="mb-2 font-medium">Exception report (unpaired punches)</h2>
        <ul className="space-y-1 text-sm">
          {exceptions.map((e) => (
            <li key={e.id}>
              {formatEmployeeName(e.employee)} · {e.manilaDate.toISOString().slice(0, 10)} · {e.dayType}
            </li>
          ))}
          {exceptions.length === 0 ? <li className="text-[var(--muted)]">None</li> : null}
        </ul>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-2 font-medium">Attendance register (recent)</h2>
        <ul className="space-y-1 text-sm">
          {attendance.map((a) => (
            <li key={a.id}>
              {a.employee.employeeNo} {formatEmployeeName(a.employee)} · {a.punchType} · {a.punchedAt.toISOString()}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">Contribution summary (latest finalized run)</h2>
        {latestRun && contrib ? (
          <div className="text-sm">
            <p className="mb-2 text-[var(--muted)]">
              Period {latestRun.period.startDate.toISOString().slice(0, 10)} →{" "}
              {latestRun.period.endDate.toISOString().slice(0, 10)}
            </p>
            <ul className="space-y-1">
              <li>
                SSS EE {formatPhp(contrib.sssEe)} / ER {formatPhp(contrib.sssEr)}
              </li>
              <li>
                PhilHealth EE {formatPhp(contrib.phEe)} / ER {formatPhp(contrib.phEr)}
              </li>
              <li>
                Pag-IBIG EE {formatPhp(contrib.pagEe)} / ER {formatPhp(contrib.pagEr)}
              </li>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">No finalized payroll yet.</p>
        )}
      </Card>
    </div>
  );
}
