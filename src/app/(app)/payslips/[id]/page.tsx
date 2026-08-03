import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPhp } from "@/lib/money";
import { formatEmployeeName } from "@/lib/employee-name";
import { Card, PageHeader } from "@/components/ui";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

function Line({
  label,
  amount,
  strong,
  large,
}: {
  label: string;
  amount: number;
  strong?: boolean;
  large?: boolean;
}) {
  return (
    <>
      <dt className={large ? "mt-3 text-base font-semibold" : strong ? "font-medium" : "text-muted"}>
        {label}
      </dt>
      <dd
        className={`text-right tabular-nums ${large ? "mt-3 text-base font-semibold" : strong ? "font-medium" : ""}`}
      >
        {formatPhp(amount)}
      </dd>
    </>
  );
}

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
  if (
    user.employeeId &&
    user.employeeId !== item.employeeId &&
    !["HR", "ADMIN", "FINANCE"].includes(user.role)
  ) {
    notFound();
  }

  const company = item.run.period.company;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Payslip"
        subtitle={company.name}
        actions={
          <Link
            href="/payslips"
            className="focus-ring inline-flex min-h-9 items-center rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:border-accent/50 hover:text-accent"
          >
            ← All payslips
          </Link>
        }
      />

      <Card padded={false} className="overflow-hidden">
        <div className="border-b border-border bg-accent-soft/40 px-5 py-4">
          <p className="font-[family-name:var(--font-display)] text-xl tracking-tight">
            {item.employee.employeeNo} — {formatEmployeeName(item.employee)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {item.run.period.startDate.toISOString().slice(0, 10)} →{" "}
            {item.run.period.endDate.toISOString().slice(0, 10)} · Pay date{" "}
            {item.run.period.payDate.toISOString().slice(0, 10)}
          </p>
          <p className="mt-2 text-xs text-muted">
            Employer TIN: {company.tin ?? "—"} · SSS: {company.sssEmployerNo ?? "—"}
          </p>
        </div>

        <div className="px-5 py-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Earnings
          </p>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <Line label="Regular pay" amount={item.regularPayCentavos} />
            <Line label="Overtime" amount={item.otPayCentavos} />
            <Line label="Holiday premium" amount={item.holidayPayCentavos} />
            <Line label="Night differential" amount={item.ndPayCentavos} />
            <Line label="Gross" amount={item.grossCentavos} strong />
          </dl>

          <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Deductions
          </p>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <Line label="SSS (Employee)" amount={item.sssEeCentavos} />
            <Line label="PhilHealth (Employee)" amount={item.philhealthEeCentavos} />
            <Line label="Pag-IBIG (Employee)" amount={item.pagibigEeCentavos} />
            <Line label="Withholding tax" amount={item.taxCentavos} />
            <Line label="Net pay" amount={item.netCentavos} large />
          </dl>

          <p className="mt-6 text-xs text-muted">
            Employer shares (not deducted): SSS {formatPhp(item.sssErCentavos)} · PhilHealth{" "}
            {formatPhp(item.philhealthErCentavos)} · Pag-IBIG {formatPhp(item.pagibigErCentavos)}
          </p>

          <div className="mt-6">
            <a
              href={`/api/payslips/${item.id}/pdf`}
              className="motion-btn motion-press focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-md bg-accent px-4 py-2.5 text-base font-medium text-white hover:bg-accent-hover sm:w-auto"
            >
              Download PDF
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
