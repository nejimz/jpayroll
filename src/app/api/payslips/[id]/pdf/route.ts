import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEmployeeName } from "@/lib/employee-name";
import { renderToBuffer } from "@react-pdf/renderer";
import { PayslipDocument } from "@/domain/payslip-pdf";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  // Resolve from DB (not JWT alone) so companyId/employeeId stay valid after reseed.
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const item = await prisma.payrollItem.findUnique({
    where: { id },
    include: {
      employee: true,
      payslip: true,
      run: { include: { period: { include: { company: true } } } },
    },
  });
  if (!item?.payslip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.run.period.companyId !== user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (
    user.employeeId &&
    user.employeeId !== item.employeeId &&
    !["HR", "ADMIN", "FINANCE"].includes(user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = await renderToBuffer(
    PayslipDocument({
      companyName: item.run.period.company.name,
      tin: item.run.period.company.tin,
      employeeName: formatEmployeeName(item.employee),
      employeeNo: item.employee.employeeNo,
      periodStart: item.run.period.startDate.toISOString().slice(0, 10),
      periodEnd: item.run.period.endDate.toISOString().slice(0, 10),
      regular: item.regularPayCentavos,
      ot: item.otPayCentavos,
      holiday: item.holidayPayCentavos,
      nd: item.ndPayCentavos,
      gross: item.grossCentavos,
      sssEe: item.sssEeCentavos,
      phEe: item.philhealthEeCentavos,
      pagEe: item.pagibigEeCentavos,
      tax: item.taxCentavos,
      net: item.netCentavos,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="payslip-${item.employee.employeeNo}.pdf"`,
    },
  });
}
