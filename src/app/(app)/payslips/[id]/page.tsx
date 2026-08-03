import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPhp } from "@/lib/money";
import { formatEmployeeName } from "@/lib/employee-name";
import { Card, PageHeader } from "@/components/ui";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function PayslipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const item = await prisma.payrollItem.findUnique({
    where: { id },
    include: {
      employee: true,
      payslip: true,
      run: { include: { period: { include: { company: true } } } },
    },
  });
  if (!item?.payslip) notFound();
  if (item.run.period.companyId !== user.companyId) notFound();
  if (user.employeeId && user.employeeId !== item.employeeId && !["HR", "ADMIN", "FINANCE"].includes(user.role)) {
    notFound();
  }

  const company = item.run.period.company;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Payslip" subtitle={company.name} />
      <Card>
        <div className="mb-4 border-b border-[var(--border)] pb-3 text-sm">
          <p>
            Employer TIN: {company.tin ?? "—"} · SSS: {company.sssEmployerNo ?? "—"}
          </p>
          <p>
            Period {item.run.period.startDate.toISOString().slice(0, 10)} →{" "}
            {item.run.period.endDate.toISOString().slice(0, 10)} · Pay date{" "}
            {item.run.period.payDate.toISOString().slice(0, 10)}
          </p>
          <p className="mt-2 font-medium">
            {item.employee.employeeNo} — {formatEmployeeName(item.employee)}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-[var(--muted)]">Regular pay</dt>
          <dd className="text-right">{formatPhp(item.regularPayCentavos)}</dd>
          <dt className="text-[var(--muted)]">Overtime</dt>
          <dd className="text-right">{formatPhp(item.otPayCentavos)}</dd>
          <dt className="text-[var(--muted)]">Holiday premium</dt>
          <dd className="text-right">{formatPhp(item.holidayPayCentavos)}</dd>
          <dt className="text-[var(--muted)]">Night differential</dt>
          <dd className="text-right">{formatPhp(item.ndPayCentavos)}</dd>
          <dt className="font-medium">Gross</dt>
          <dd className="text-right font-medium">{formatPhp(item.grossCentavos)}</dd>
          <dt className="text-[var(--muted)]">SSS (Employee)</dt>
          <dd className="text-right">{formatPhp(item.sssEeCentavos)}</dd>
          <dt className="text-[var(--muted)]">PhilHealth (Employee)</dt>
          <dd className="text-right">{formatPhp(item.philhealthEeCentavos)}</dd>
          <dt className="text-[var(--muted)]">Pag-IBIG (Employee)</dt>
          <dd className="text-right">{formatPhp(item.pagibigEeCentavos)}</dd>
          <dt className="text-[var(--muted)]">Withholding tax</dt>
          <dd className="text-right">{formatPhp(item.taxCentavos)}</dd>
          <dt className="mt-2 text-base font-semibold">Net pay</dt>
          <dd className="mt-2 text-right text-base font-semibold">{formatPhp(item.netCentavos)}</dd>
        </dl>
        <p className="mt-4 text-xs text-[var(--muted)]">
          Employer shares (not deducted): SSS {formatPhp(item.sssErCentavos)} · PhilHealth{" "}
          {formatPhp(item.philhealthErCentavos)} · Pag-IBIG {formatPhp(item.pagibigErCentavos)}
        </p>
        <Link href={`/api/payslips/${item.id}/pdf`} className="mt-4 inline-block text-sm text-[var(--accent)]">
          Download PDF →
        </Link>
      </Card>
    </div>
  );
}
