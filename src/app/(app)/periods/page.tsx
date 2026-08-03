import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createPeriodAction, lockPeriodAction, runPayrollAction } from "../actions/payroll";
import {
  Button,
  Card,
  EmptyState,
  Field,
  inputClass,
  PageHeader,
  SectionLabel,
  StatusPill,
} from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";

function periodTone(status: string): "neutral" | "success" | "warning" | "accent" | "danger" {
  if (status === "OPEN") return "accent";
  if (status === "LOCKED") return "warning";
  if (status === "FINALIZED") return "success";
  return "neutral";
}

export default async function PeriodsPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN", "FINANCE"].includes(user.role)) redirect("/dashboard");
  const periods = await prisma.payrollPeriod.findMany({
    where: { companyId: user.companyId },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Payroll periods" subtitle="Open → lock → draft payroll → finalize." />

      {["HR", "ADMIN"].includes(user.role) ? (
        <section>
          <SectionLabel>Create period</SectionLabel>
          <Card>
            <form action={createPeriodAction} className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
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
                <Button type="submit" className="min-h-10 w-full md:w-auto">
                  Create period
                </Button>
              </div>
            </form>
          </Card>
        </section>
      ) : null}

      <section>
        <SectionLabel>All periods</SectionLabel>
        {periods.length === 0 ? (
          <Card padded={false}>
            <EmptyState title="No periods yet" description="Create a cut-off period to begin." />
          </Card>
        ) : (
          <ul className="space-y-3">
            {periods.map((p) => (
              <Card key={p.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {p.startDate.toISOString().slice(0, 10)} →{" "}
                      {p.endDate.toISOString().slice(0, 10)}
                    </p>
                    <StatusPill tone={periodTone(p.status)}>{p.status}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Pay {p.payDate.toISOString().slice(0, 10)}
                    {p.runs[0] ? (
                      <>
                        {" "}
                        ·{" "}
                        <Link className="font-medium text-accent hover:underline" href={`/payroll/${p.runs[0].id}`}>
                          Run {p.runs[0].status}
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.status === "OPEN" && ["HR", "ADMIN"].includes(user.role) ? (
                    <form action={lockPeriodAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" variant="secondary" className="min-h-11">
                        Lock
                      </Button>
                    </form>
                  ) : null}
                  {["LOCKED", "DRAFT_PAYROLL"].includes(p.status) &&
                  ["HR", "ADMIN"].includes(user.role) ? (
                    <form action={runPayrollAction}>
                      <input type="hidden" name="periodId" value={p.id} />
                      <Button type="submit" className="min-h-11">
                        Run / recalculate payroll
                      </Button>
                    </form>
                  ) : null}
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
