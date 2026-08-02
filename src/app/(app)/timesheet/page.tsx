import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatManilaDate } from "@/lib/manila";
import { Card, PageHeader } from "@/components/ui";
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
    <div>
      <PageHeader title="My timesheet" subtitle="Daily summaries recomputed from punches." />
      <div className="mb-4">
        <Link href="/corrections" className="text-sm text-[var(--accent)]">
          Request missed punch →
        </Link>
      </div>
      <Card className="mb-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[var(--muted)]">
            <tr>
              <th className="py-2">Date</th>
              <th>Type</th>
              <th>Regular</th>
              <th>OT</th>
              <th>Late</th>
              <th>UT</th>
              <th>ND</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.id} className="border-t border-[var(--border)]">
                <td className="py-2">{formatManilaDate(d.manilaDate)}</td>
                <td>{d.dayType}</td>
                <td>{d.regularMinutes}m</td>
                <td>{d.otMinutes}m</td>
                <td>{d.lateMinutes}m</td>
                <td>{d.undertimeMinutes}m</td>
                <td>{d.ndMinutes}m</td>
                <td>
                  {d.hasUnpairedPunch ? "unpaired " : ""}
                  {d.isAdjusted ? "adjusted" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <h2 className="mb-2 font-medium">Recent punches</h2>
        <ul className="space-y-1 text-sm">
          {punches.map((p) => (
            <li key={p.id}>
              {p.punchType} · {p.punchedAt.toISOString()} · {p.source}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
