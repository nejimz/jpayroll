import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPhp } from "@/lib/money";
import { formatEmployeeName } from "@/lib/employee-name";
import { finalizePayrollAction } from "../../actions/payroll";
import { Button, PageHeader, StatTile, StatusPill } from "@/components/ui";
import { redirect, notFound } from "next/navigation";

export default async function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN", "FINANCE"].includes(user.role)) redirect("/dashboard");
  const { id } = await params;
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      period: true,
      items: { include: { employee: true }, orderBy: { employee: { employeeNo: "asc" } } },
    },
  });
  if (!run || run.period.companyId !== user.companyId) notFound();

  const totals = run.items.reduce(
    (acc, i) => {
      acc.gross += i.grossCentavos;
      acc.net += i.netCentavos;
      acc.tax += i.taxCentavos;
      acc.sss += i.sssEeCentavos + i.sssErCentavos;
      return acc;
    },
    { gross: 0, net: 0, tax: 0, sss: 0 }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll register"
        subtitle={`${run.period.startDate.toISOString().slice(0, 10)} → ${run.period.endDate.toISOString().slice(0, 10)}`}
        actions={<StatusPill tone={run.status === "FINALIZED" ? "success" : "accent"}>{run.status}</StatusPill>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Gross" value={formatPhp(totals.gross)} />
        <StatTile label="Net" value={formatPhp(totals.net)} />
        <StatTile label="Withholding" value={formatPhp(totals.tax)} />
        <StatTile label="SSS EE+ER" value={formatPhp(totals.sss)} />
      </div>

      {run.status === "DRAFT" ? (
        <form action={finalizePayrollAction}>
          <input type="hidden" name="runId" value={run.id} />
          <Button type="submit" size="lg">
            Finalize & publish payslips
          </Button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-background/80">
              {[
                "Employee",
                "Regular",
                "OT",
                "Holiday",
                "ND",
                "Gross",
                "SSS EE",
                "PH EE",
                "HDMF EE",
                "Tax",
                "Net",
              ].map((h) => (
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
            {run.items.map((i) => (
              <tr key={i.id} className="hover:bg-background/60">
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {i.employee.employeeNo} {formatEmployeeName(i.employee)}
                </td>
                <td className="px-3 py-2.5 tabular-nums">{formatPhp(i.regularPayCentavos)}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatPhp(i.otPayCentavos)}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatPhp(i.holidayPayCentavos)}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatPhp(i.ndPayCentavos)}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatPhp(i.grossCentavos)}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatPhp(i.sssEeCentavos)}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatPhp(i.philhealthEeCentavos)}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatPhp(i.pagibigEeCentavos)}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatPhp(i.taxCentavos)}</td>
                <td className="px-3 py-2.5 font-medium tabular-nums">{formatPhp(i.netCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Table versions: SSS {run.sssTableId?.slice(0, 8)}… · Tax {run.taxTableId?.slice(0, 8)}… ·
        snapshot {run.timesheetSnapshotHash?.slice(0, 12)}…
      </p>
    </div>
  );
}
