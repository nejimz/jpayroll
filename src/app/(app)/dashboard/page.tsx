import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { formatManilaDateTime } from "@/lib/manila";
import { formatPhp } from "@/lib/money";
import Link from "next/link";
import { redirect } from "next/navigation";

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

  let lastPayslipNet: number | null = null;
  if (user.employeeId) {
    const item = await prisma.payrollItem.findFirst({
      where: { employeeId: user.employeeId, payslip: { isNot: null } },
      orderBy: { run: { finalizedAt: "desc" } },
    });
    lastPayslipNet = item?.netCentavos ?? null;
  }

  return (
    <div>
      <PageHeader title={`Hello, ${user.name}`} subtitle={company.name} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-[var(--muted)]">Open cut-off</p>
          <p className="mt-2 text-lg font-medium">
            {openPeriod
              ? `${openPeriod.startDate.toISOString().slice(0, 10)} → ${openPeriod.endDate.toISOString().slice(0, 10)}`
              : "None"}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Pending corrections</p>
          <p className="mt-2 text-lg font-medium">{pendingCorrections}</p>
          <Link href="/corrections" className="mt-2 inline-block text-sm text-[var(--accent)]">
            Review
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Last net pay</p>
          <p className="mt-2 text-lg font-medium">
            {lastPayslipNet != null ? formatPhp(lastPayslipNet) : "—"}
          </p>
        </Card>
      </div>
      <Card className="mt-4">
        <p className="text-sm text-[var(--muted)]">Server time (Manila display)</p>
        <p className="mt-1">{formatManilaDateTime(new Date())}</p>
        {user.employeeId ? (
          <Link href="/clock" className="mt-3 inline-block text-[var(--accent)]">
            Go to Time In / Out →
          </Link>
        ) : null}
      </Card>
    </div>
  );
}
