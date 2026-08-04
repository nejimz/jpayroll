import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEmployeeName } from "@/lib/employee-name";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { IdCardSelector } from "@/components/IdCardSelector";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function IdCardsPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN"].includes(user.role)) redirect("/dashboard");

  const employees = await prisma.employee.findMany({
    where: { companyId: user.companyId, status: "ACTIVE" },
    include: { department: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const rows = employees.map((e) => ({
    id: e.id,
    employeeNo: e.employeeNo,
    name: formatEmployeeName(e),
    department: e.department?.name ?? null,
    badgeCode: e.badgeCode,
  }));

  const printableCount = rows.filter((r) => Boolean(r.badgeCode?.trim())).length;

  return (
    <div>
      <PageHeader
        title="ID cards"
        subtitle="Print employee badges with Code128 barcode and QR for kiosk scanning."
        actions={
          <Link
            href="/employees"
            className="focus-ring inline-flex min-h-9 items-center rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:border-accent/50 hover:text-accent"
          >
            Employee directory
          </Link>
        }
      />

      {rows.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="No active employees"
            description="Add employees and set a badge code before printing ID cards."
          />
        </Card>
      ) : printableCount === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="No badge codes set"
            description="Set badgeCode on employee records (used by the kiosk) to enable ID card printing."
          />
        </Card>
      ) : (
        <IdCardSelector employees={rows} />
      )}
    </div>
  );
}
