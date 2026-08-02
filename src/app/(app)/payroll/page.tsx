import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPhp } from "@/lib/money";
import { Card, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PayrollListPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN", "FINANCE"].includes(user.role)) redirect("/dashboard");
  const runs = await prisma.payrollRun.findMany({
    where: { period: { companyId: user.companyId } },
    include: {
      period: true,
      items: { select: { netCentavos: true, grossCentavos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Payroll runs" subtitle="Draft and finalized runs for locked periods." />
      <div className="space-y-3">
        {runs.map((r) => {
          const gross = r.items.reduce((s, i) => s + i.grossCentavos, 0);
          const net = r.items.reduce((s, i) => s + i.netCentavos, 0);
          return (
            <Card key={r.id}>
              <Link href={`/payroll/${r.id}`} className="block">
                <p className="font-medium">
                  {r.period.startDate.toISOString().slice(0, 10)} → {r.period.endDate.toISOString().slice(0, 10)}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  {r.status} · {r.items.length} employees · Gross {formatPhp(gross)} · Net {formatPhp(net)}
                </p>
              </Link>
            </Card>
          );
        })}
        {runs.length === 0 ? <p className="text-sm text-[var(--muted)]">No runs yet. Lock a period and run payroll.</p> : null}
      </div>
    </div>
  );
}
