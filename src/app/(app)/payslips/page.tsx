import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPhp } from "@/lib/money";
import { formatEmployeeName } from "@/lib/employee-name";
import { Card, EmptyState, PageHeader, StatusPill } from "@/components/ui";
import Link from "next/link";

export default async function PayslipsPage() {
  const user = await getSessionUser();

  const items = user?.employeeId
    ? await prisma.payrollItem.findMany({
        where: { employeeId: user.employeeId, payslip: { isNot: null } },
        include: { payslip: true, run: { include: { period: true } }, employee: true },
        orderBy: { run: { finalizedAt: "desc" } },
      })
    : ["HR", "ADMIN", "FINANCE"].includes(user!.role)
      ? await prisma.payrollItem.findMany({
          where: { run: { status: "FINALIZED", period: { companyId: user!.companyId } } },
          include: { payslip: true, run: { include: { period: true } }, employee: true },
          orderBy: { run: { finalizedAt: "desc" } },
          take: 50,
        })
      : [];

  return (
    <div>
      <PageHeader title="Payslips" subtitle="Published after payroll finalize." />

      {items.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="No payslips yet"
            description="Payslips appear here after a payroll run is finalized."
          />
        </Card>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                href={`/payslips/${i.id}`}
                className="focus-ring flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-background/80 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{formatEmployeeName(i.employee)}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {i.run.period.startDate.toISOString().slice(0, 10)} →{" "}
                    {i.run.period.endDate.toISOString().slice(0, 10)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 sm:hidden">
                    <StatusPill tone="neutral">Gross {formatPhp(i.grossCentavos)}</StatusPill>
                    <StatusPill tone="accent">Net {formatPhp(i.netCentavos)}</StatusPill>
                  </div>
                </div>
                <div className="hidden items-center gap-4 sm:flex">
                  <div className="text-right text-sm">
                    <p className="text-muted">Gross {formatPhp(i.grossCentavos)}</p>
                    <p className="font-medium text-foreground">Net {formatPhp(i.netCentavos)}</p>
                  </div>
                  <span className="text-sm font-medium text-accent">View →</span>
                </div>
                <span className="text-sm font-medium text-accent sm:hidden">View payslip →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
