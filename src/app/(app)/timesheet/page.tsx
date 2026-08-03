import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatManilaDate, formatManilaDateTime } from "@/lib/manila";
import { Card, EmptyState, PageHeader, SectionLabel, StatusPill } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TimesheetPage() {
  const user = await getSessionUser();
  if (!user?.employeeId) redirect("/dashboard");
  const days = await prisma.timesheetDay.findMany({
    where: { employeeId: user.employeeId },
    orderBy: { manilaDate: "desc" },
    take: 45,
  });
  const punches = await prisma.attendanceLog.findMany({
    where: { employeeId: user.employeeId },
    orderBy: { punchedAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="My timesheet"
        subtitle="Daily summaries recomputed from punches."
        actions={
          <Link
            href="/corrections"
            className="focus-ring inline-flex min-h-10 items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-accent hover:border-accent/50"
          >
            Request missed punch
          </Link>
        }
      />

      <section>
        <SectionLabel>Daily summary</SectionLabel>
        {/* Mobile list */}
        <ul className="space-y-2 md:hidden">
          {days.length === 0 ? (
            <Card padded={false}>
              <EmptyState title="No timesheet days yet" description="Clock in to start recording." />
            </Card>
          ) : (
            days.map((d) => (
              <Card key={d.id} className="text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{formatManilaDate(d.manilaDate)}</p>
                    <p className="text-muted">{d.dayType}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {d.hasUnpairedPunch ? <StatusPill tone="danger">Unpaired</StatusPill> : null}
                    {d.isAdjusted ? <StatusPill tone="warning">Adjusted</StatusPill> : null}
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
                  <div>
                    <dt>Regular</dt>
                    <dd className="font-medium text-foreground">{d.regularMinutes}m</dd>
                  </div>
                  <div>
                    <dt>OT</dt>
                    <dd className="font-medium text-foreground">{d.otMinutes}m</dd>
                  </div>
                  <div>
                    <dt>Late / UT</dt>
                    <dd className="font-medium text-foreground">
                      {d.lateMinutes}m / {d.undertimeMinutes}m
                    </dd>
                  </div>
                </dl>
              </Card>
            ))
          )}
        </ul>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)] md:block">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-background/80">
                {["Date", "Type", "Regular", "OT", "Late", "UT", "ND", "Flags"].map((h) => (
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
              {days.map((d) => (
                <tr key={d.id} className="hover:bg-background/60">
                  <td className="px-3 py-2.5">{formatManilaDate(d.manilaDate)}</td>
                  <td className="px-3 py-2.5">{d.dayType}</td>
                  <td className="px-3 py-2.5 tabular-nums">{d.regularMinutes}m</td>
                  <td className="px-3 py-2.5 tabular-nums">{d.otMinutes}m</td>
                  <td className="px-3 py-2.5 tabular-nums">{d.lateMinutes}m</td>
                  <td className="px-3 py-2.5 tabular-nums">{d.undertimeMinutes}m</td>
                  <td className="px-3 py-2.5 tabular-nums">{d.ndMinutes}m</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {d.hasUnpairedPunch ? <StatusPill tone="danger">Unpaired</StatusPill> : null}
                      {d.isAdjusted ? <StatusPill tone="warning">Adjusted</StatusPill> : null}
                      {!d.hasUnpairedPunch && !d.isAdjusted ? (
                        <span className="text-muted">—</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {days.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted">
                    No timesheet days yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionLabel>Recent punches</SectionLabel>
        <Card padded={false}>
          {punches.length === 0 ? (
            <EmptyState title="No punches yet" />
          ) : (
            <ul className="divide-y divide-border">
              {punches.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <StatusPill tone={p.punchType === "IN" ? "accent" : "neutral"}>
                      {p.punchType}
                    </StatusPill>
                    <span>{formatManilaDateTime(p.punchedAt)}</span>
                  </div>
                  <span className="text-xs text-muted">{p.source}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
