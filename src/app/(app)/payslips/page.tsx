import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPhp } from "@/lib/money";
import { formatEmployeeName } from "@/lib/employee-name";
import { Card, PageHeader } from "@/components/ui";
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
      <div className="space-y-3">
        {items.map((i) => (
          <Card key={i.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {formatEmployeeName(i.employee)} · {i.run.period.startDate.toISOString().slice(0, 10)} →{" "}
                  {i.run.period.endDate.toISOString().slice(0, 10)}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  Gross {formatPhp(i.grossCentavos)} · Net {formatPhp(i.netCentavos)}
                </p>
              </div>
              <Link className="text-sm text-[var(--accent)]" href={`/payslips/${i.id}`}>
                View payslip →
              </Link>
            </div>
          </Card>
        ))}
        {items.length === 0 ? <p className="text-sm text-[var(--muted)]">No payslips yet.</p> : null}
      </div>
    </div>
  );
}
