import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPhp } from "@/lib/money";
import { formatEmployeeName } from "@/lib/employee-name";
import { finalizePayrollAction } from "../../actions/payroll";
import { Button, Card, PageHeader } from "@/components/ui";
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
    <div>
      <PageHeader
        title="Payroll register"
        subtitle={`${run.period.startDate.toISOString().slice(0, 10)} → ${run.period.endDate.toISOString().slice(0, 10)} · ${run.status}`}
      />
      <Card className="mb-4 grid gap-2 md:grid-cols-4 text-sm">
        <div>
          <p className="text-[var(--muted)]">Gross</p>
          <p className="font-medium">{formatPhp(totals.gross)}</p>
        </div>
        <div>
          <p className="text-[var(--muted)]">Net</p>
          <p className="font-medium">{formatPhp(totals.net)}</p>
        </div>
        <div>
          <p className="text-[var(--muted)]">Withholding</p>
          <p className="font-medium">{formatPhp(totals.tax)}</p>
        </div>
        <div>
          <p className="text-[var(--muted)]">SSS EE+ER</p>
          <p className="font-medium">{formatPhp(totals.sss)}</p>
        </div>
      </Card>

      {run.status === "DRAFT" ? (
        <form action={finalizePayrollAction} className="mb-4">
          <input type="hidden" name="runId" value={run.id} />
          <Button type="submit">Finalize & publish payslips</Button>
        </form>
      ) : null}

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[var(--muted)]">
            <tr>
              <th className="py-2">Employee</th>
              <th>Regular</th>
              <th>OT</th>
              <th>Holiday</th>
              <th>ND</th>
              <th>Gross</th>
              <th>SSS EE</th>
              <th>PH EE</th>
              <th>HDMF EE</th>
              <th>Tax</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {run.items.map((i) => (
              <tr key={i.id} className="border-t border-[var(--border)]">
                <td className="py-2">
                  {i.employee.employeeNo} {formatEmployeeName(i.employee)}
                </td>
                <td>{formatPhp(i.regularPayCentavos)}</td>
                <td>{formatPhp(i.otPayCentavos)}</td>
                <td>{formatPhp(i.holidayPayCentavos)}</td>
                <td>{formatPhp(i.ndPayCentavos)}</td>
                <td>{formatPhp(i.grossCentavos)}</td>
                <td>{formatPhp(i.sssEeCentavos)}</td>
                <td>{formatPhp(i.philhealthEeCentavos)}</td>
                <td>{formatPhp(i.pagibigEeCentavos)}</td>
                <td>{formatPhp(i.taxCentavos)}</td>
                <td className="font-medium">{formatPhp(i.netCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Table versions: SSS {run.sssTableId?.slice(0, 8)}… · Tax {run.taxTableId?.slice(0, 8)}… · snapshot{" "}
        {run.timesheetSnapshotHash?.slice(0, 12)}…
      </p>
    </div>
  );
}
