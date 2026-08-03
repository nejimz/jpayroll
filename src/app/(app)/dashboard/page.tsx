import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatTile, Card, StatusPill, SectionLabel } from "@/components/ui";
import { formatManilaDateTime } from "@/lib/manila";
import { formatPhp } from "@/lib/money";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ManilaLiveClock } from "@/components/ManilaLiveClock";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const company = await prisma.company.findUnique({ where: { id: user.companyId } });
  if (!company) redirect("/login");

  const openPeriod = await prisma.payrollPeriod.findFirst({
    where: { companyId: user.companyId, status: "OPEN" },
    orderBy: { startDate: "desc" },
  });

  const pendingCorrections = await prisma.missedPunchRequest.count({
    where: { status: "PENDING", employee: { companyId: user.companyId } },
  });

  const unpairedDays = await prisma.timesheetDay.count({
    where: { hasUnpairedPunch: true, employee: { companyId: user.companyId } },
  });

  const draftRun = await prisma.payrollRun.findFirst({
    where: { status: "DRAFT", period: { companyId: user.companyId } },
    include: { period: true },
    orderBy: { createdAt: "desc" },
  });

  let lastPayslipNet: number | null = null;
  if (user.employeeId) {
    const item = await prisma.payrollItem.findFirst({
      where: { employeeId: user.employeeId, payslip: { isNot: null } },
      orderBy: { run: { finalizedAt: "desc" } },
    });
    lastPayslipNet = item?.netCentavos ?? null;
  }

  const canReview = ["HR", "ADMIN", "MANAGER"].includes(user.role);
  const canPayroll = ["HR", "ADMIN", "FINANCE"].includes(user.role);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hello, ${user.name}`}
        subtitle={company.name}
        actions={
          user.employeeId ? (
            <Link
              href="/clock"
              className="motion-btn motion-press focus-ring inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 py-2.5 text-base font-medium text-white hover:bg-accent-hover"
            >
              Go to Time In / Out
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Open cut-off"
          value={
            openPeriod
              ? `${openPeriod.startDate.toISOString().slice(5, 10)} → ${openPeriod.endDate.toISOString().slice(5, 10)}`
              : "None"
          }
          hint={
            openPeriod
              ? `Pay date ${openPeriod.payDate.toISOString().slice(0, 10)}`
              : "Create a period to start a cut-off"
          }
          href={canPayroll ? "/periods" : undefined}
          hrefLabel="Periods"
        />
        <StatTile
          label="Pending corrections"
          value={pendingCorrections}
          hint={unpairedDays > 0 ? `${unpairedDays} unpaired timesheet days` : undefined}
          href={canReview || user.employeeId ? "/corrections" : undefined}
          hrefLabel="Review"
        />
        {user.employeeId ? (
          <StatTile
            label="Last net pay"
            value={lastPayslipNet != null ? formatPhp(lastPayslipNet) : "—"}
            href="/payslips"
            hrefLabel="Payslips"
          />
        ) : (
          <StatTile
            label="Draft payroll"
            value={draftRun ? draftRun.status : "None"}
            hint={
              draftRun
                ? `${draftRun.period.startDate.toISOString().slice(0, 10)} → ${draftRun.period.endDate.toISOString().slice(0, 10)}`
                : "No draft run"
            }
            href={draftRun ? `/payroll/${draftRun.id}` : canPayroll ? "/payroll" : undefined}
            hrefLabel={draftRun ? "Open register" : "Payroll"}
          />
        )}
      </div>

      {(canReview || canPayroll) && (pendingCorrections > 0 || unpairedDays > 0 || draftRun) ? (
        <section>
          <SectionLabel>Needs attention</SectionLabel>
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
            {pendingCorrections > 0 ? (
              <li>
                <Link
                  href="/corrections"
                  className="focus-ring flex items-center justify-between gap-3 px-4 py-3.5 text-sm hover:bg-background/80"
                >
                  <span>
                    <span className="font-medium">{pendingCorrections}</span> pending punch
                    correction{pendingCorrections === 1 ? "" : "s"}
                  </span>
                  <StatusPill tone="warning" dot>
                    Review
                  </StatusPill>
                </Link>
              </li>
            ) : null}
            {unpairedDays > 0 && canReview ? (
              <li>
                <Link
                  href="/reports"
                  className="focus-ring flex items-center justify-between gap-3 px-4 py-3.5 text-sm hover:bg-background/80"
                >
                  <span>
                    <span className="font-medium">{unpairedDays}</span> unpaired timesheet day
                    {unpairedDays === 1 ? "" : "s"}
                  </span>
                  <StatusPill tone="danger" dot>
                    Exceptions
                  </StatusPill>
                </Link>
              </li>
            ) : null}
            {draftRun && canPayroll ? (
              <li>
                <Link
                  href={`/payroll/${draftRun.id}`}
                  className="focus-ring flex items-center justify-between gap-3 px-4 py-3.5 text-sm hover:bg-background/80"
                >
                  <span>
                    Draft payroll ready to finalize ·{" "}
                    {draftRun.period.startDate.toISOString().slice(0, 10)} →{" "}
                    {draftRun.period.endDate.toISOString().slice(0, 10)}
                  </span>
                  <StatusPill tone="accent" dot>
                    Draft
                  </StatusPill>
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <Card className="overflow-hidden">
        <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Server time
            </p>
            <p className="mt-1 text-sm text-muted">
              Snapshot: {formatManilaDateTime(new Date())}
            </p>
          </div>
          <ManilaLiveClock size="md" />
        </div>
      </Card>
    </div>
  );
}
