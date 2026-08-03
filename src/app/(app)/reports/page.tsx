import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPhp } from "@/lib/money";
import { formatEmployeeName } from "@/lib/employee-name";
import { formatManilaDateTime } from "@/lib/manila";
import { Card, EmptyState, PageHeader, SectionLabel, StatTile, StatusPill } from "@/components/ui";
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
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle="Attendance, exceptions, and contribution summary." />

      {contrib ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="SSS (latest run)"
            value={formatPhp(contrib.sssEe + contrib.sssEr)}
            hint={`EE ${formatPhp(contrib.sssEe)} / ER ${formatPhp(contrib.sssEr)}`}
          />
          <StatTile
            label="PhilHealth"
            value={formatPhp(contrib.phEe + contrib.phEr)}
            hint={`EE ${formatPhp(contrib.phEe)} / ER ${formatPhp(contrib.phEr)}`}
          />
          <StatTile
            label="Pag-IBIG"
            value={formatPhp(contrib.pagEe + contrib.pagEr)}
            hint={`EE ${formatPhp(contrib.pagEe)} / ER ${formatPhp(contrib.pagEr)}`}
          />
        </div>
      ) : null}

      <section>
        <SectionLabel>Exception report (unpaired punches)</SectionLabel>
        {exceptions.length === 0 ? (
          <Card padded={false}>
            <EmptyState title="No exceptions" description="All punches are paired." />
          </Card>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
            {exceptions.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">{formatEmployeeName(e.employee)}</span>
                  <span className="text-muted">
                    {" "}
                    · {e.manilaDate.toISOString().slice(0, 10)} · {e.dayType}
                  </span>
                </span>
                <StatusPill tone="danger">Unpaired</StatusPill>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionLabel>Attendance register (recent)</SectionLabel>
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-background/80">
                {["Employee", "Type", "Time", "Source"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attendance.map((a) => (
                <tr key={a.id} className="hover:bg-background/60">
                  <td className="px-3 py-2.5">
                    {a.employee.employeeNo} {formatEmployeeName(a.employee)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={a.punchType === "IN" ? "accent" : "neutral"}>
                      {a.punchType}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{formatManilaDateTime(a.punchedAt)}</td>
                  <td className="px-3 py-2.5 text-muted">{a.source}</td>
                </tr>
              ))}
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted">
                    No attendance yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionLabel>Contribution summary (latest finalized run)</SectionLabel>
        <Card>
          {latestRun && contrib ? (
            <div className="text-sm">
              <p className="mb-3 text-muted">
                Period {latestRun.period.startDate.toISOString().slice(0, 10)} →{" "}
                {latestRun.period.endDate.toISOString().slice(0, 10)}
              </p>
              <ul className="space-y-2">
                <li className="flex justify-between gap-4 border-b border-border pb-2">
                  <span>SSS</span>
                  <span className="tabular-nums">
                    EE {formatPhp(contrib.sssEe)} / ER {formatPhp(contrib.sssEr)}
                  </span>
                </li>
                <li className="flex justify-between gap-4 border-b border-border pb-2">
                  <span>PhilHealth</span>
                  <span className="tabular-nums">
                    EE {formatPhp(contrib.phEe)} / ER {formatPhp(contrib.phEr)}
                  </span>
                </li>
                <li className="flex justify-between gap-4">
                  <span>Pag-IBIG</span>
                  <span className="tabular-nums">
                    EE {formatPhp(contrib.pagEe)} / ER {formatPhp(contrib.pagEr)}
                  </span>
                </li>
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted">No finalized payroll yet.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
