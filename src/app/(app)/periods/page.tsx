import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createPeriodAction, lockPeriodAction, runPayrollAction } from "../actions/payroll";
import { Button, Card, Field, inputClass, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PeriodsPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN", "FINANCE"].includes(user.role)) redirect("/dashboard");
  const periods = await prisma.payrollPeriod.findMany({
    where: { companyId: user.companyId },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { startDate: "desc" },
  });

  return (
    <div>
      <PageHeader title="Payroll periods" subtitle="Open → lock → draft payroll → finalize." />
      {["HR", "ADMIN"].includes(user.role) ? (
        <Card className="mb-6">
          <form action={createPeriodAction} className="grid gap-3 md:grid-cols-4">
            <Field label="Start">
              <input className={inputClass} name="startDate" type="date" required />
            </Field>
            <Field label="End">
              <input className={inputClass} name="endDate" type="date" required />
            </Field>
            <Field label="Pay date">
              <input className={inputClass} name="payDate" type="date" required />
            </Field>
            <div className="flex items-end">
              <Button type="submit">Create period</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="space-y-3">
        {periods.map((p) => (
          <Card key={p.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {p.startDate.toISOString().slice(0, 10)} → {p.endDate.toISOString().slice(0, 10)}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  Pay {p.payDate.toISOString().slice(0, 10)} · {p.status}
                  {p.runs[0] ? (
                    <>
                      {" "}
                      ·{" "}
                      <Link className="text-[var(--accent)]" href={`/payroll/${p.runs[0].id}`}>
                        Run {p.runs[0].status}
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex gap-2">
                {p.status === "OPEN" && ["HR", "ADMIN"].includes(user.role) ? (
                  <form action={lockPeriodAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant="secondary">
                      Lock
                    </Button>
                  </form>
                ) : null}
                {["LOCKED", "DRAFT_PAYROLL"].includes(p.status) && ["HR", "ADMIN"].includes(user.role) ? (
                  <form action={runPayrollAction}>
                    <input type="hidden" name="periodId" value={p.id} />
                    <Button type="submit">Run / recalculate payroll</Button>
                  </form>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
