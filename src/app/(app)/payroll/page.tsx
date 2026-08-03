import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPhp } from "@/lib/money";
import { Card, EmptyState, PageHeader, StatusPill } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";

function runTone(status: string): "neutral" | "success" | "warning" | "accent" {
  if (status === "FINALIZED") return "success";
  if (status === "DRAFT") return "accent";
  return "warning";
}

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
      {runs.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="No runs yet"
            description="Lock a period and run payroll to create the first register."
            action={
              <Link
                href="/periods"
                className="focus-ring inline-flex min-h-10 items-center rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Go to periods
              </Link>
            }
          />
        </Card>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
          {runs.map((r) => {
            const gross = r.items.reduce((s, i) => s + i.grossCentavos, 0);
            const net = r.items.reduce((s, i) => s + i.netCentavos, 0);
            return (
              <li key={r.id}>
                <Link
                  href={`/payroll/${r.id}`}
                  className="focus-ring flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-background/80 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {r.period.startDate.toISOString().slice(0, 10)} →{" "}
                      {r.period.endDate.toISOString().slice(0, 10)}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {r.items.length} employees · Gross {formatPhp(gross)} · Net {formatPhp(net)}
                    </p>
                  </div>
                  <StatusPill tone={runTone(r.status)}>{r.status}</StatusPill>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
