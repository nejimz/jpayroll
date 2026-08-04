import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEmployeeName } from "@/lib/employee-name";
import { renderToBuffer } from "@react-pdf/renderer";
import { renderBarcodePngDataUrl, renderQrPngDataUrl } from "@/domain/id-card-codes";
import { IdCardDocument } from "@/domain/id-card-pdf";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["HR", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const idsParam = req.nextUrl.searchParams.get("ids");
  const ids = idsParam
    ? idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  const employees = await prisma.employee.findMany({
    where: {
      companyId: user.companyId,
      status: "ACTIVE",
      badgeCode: { not: null },
      ...(ids ? { id: { in: ids } } : {}),
    },
    include: { department: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // Drop any rows that somehow lack badgeCode (Prisma `not: null` still types as string | null)
  const printable = employees.filter(
    (e): e is typeof e & { badgeCode: string } => Boolean(e.badgeCode?.trim())
  );

  if (printable.length === 0) {
    return NextResponse.json(
      { error: "No printable employees. Active employees need a badge code." },
      { status: 400 }
    );
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: user.companyId },
  });

  const cards = await Promise.all(
    printable.map(async (e) => {
      const badgeCode = e.badgeCode;
      const [barcodeDataUrl, qrDataUrl] = await Promise.all([
        renderBarcodePngDataUrl(badgeCode),
        renderQrPngDataUrl(badgeCode),
      ]);
      return {
        employeeNo: e.employeeNo,
        employeeName: formatEmployeeName(e),
        department: e.department?.name ?? "—",
        badgeCode,
        barcodeDataUrl,
        qrDataUrl,
      };
    })
  );

  const buffer = await renderToBuffer(
    IdCardDocument({
      companyName: company.name,
      cards,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="id-cards.pdf"`,
    },
  });
}
