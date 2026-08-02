import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";
import { adjustTimesheetAction } from "../actions/attendance";
import { Button, Field, inputClass } from "@/components/ui";

export default async function TeamPage() {
  const user = await getSessionUser();
  if (!user || !["MANAGER", "HR", "ADMIN"].includes(user.role)) redirect("/dashboard");

  const employees = await prisma.employee.findMany({
    where: {
      companyId: user.companyId,
      status: "ACTIVE",
      ...(user.role === "MANAGER" && user.employeeId ? { managerId: user.employeeId } : {}),
    },
    include: {
      timesheetDays: { orderBy: { manilaDate: "desc" }, take: 3 },
      attendanceLogs: { orderBy: { punchedAt: "desc" }, take: 1 },
    },
    orderBy: { employeeNo: "asc" },
  });

  // Managers without employeeId see all (seed manager has null) — show company-wide for demo
  const list =
    user.role === "MANAGER" && user.employeeId
      ? employees
      : await prisma.employee.findMany({
          where: { companyId: user.companyId, status: "ACTIVE" },
          include: {
            timesheetDays: { orderBy: { manilaDate: "desc" }, take: 3 },
            attendanceLogs: { orderBy: { punchedAt: "desc" }, take: 1 },
          },
          orderBy: { employeeNo: "asc" },
        });

  return (
    <div>
      <PageHeader title="Team attendance" subtitle="Exceptions and recent activity." />
      <div className="space-y-3">
        {list.map((e) => {
          const last = e.attendanceLogs[0];
          const unpaired = e.timesheetDays.some((d) => d.hasUnpairedPunch);
          return (
            <Card key={e.id}>
              <p className="font-medium">
                {e.employeeNo} — {e.fullName}
                {unpaired ? <span className="ml-2 text-sm text-[var(--danger)]">unpaired punch</span> : null}
              </p>
              <p className="text-sm text-[var(--muted)]">
                Last: {last ? `${last.punchType} ${last.punchedAt.toISOString()}` : "—"}
              </p>
            </Card>
          );
        })}
      </div>

      {["HR", "ADMIN"].includes(user.role) ? (
        <Card className="mt-6">
          <h2 className="mb-3 font-medium">HR timesheet adjustment</h2>
          <form action={adjustTimesheetAction} className="grid gap-3 md:grid-cols-3">
            <Field label="Employee">
              <select className={inputClass} name="employeeId" required>
                {list.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employeeNo} {e.fullName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input className={inputClass} name="date" type="date" required />
            </Field>
            <Field label="Day type">
              <input className={inputClass} name="dayType" defaultValue="REGULAR" />
            </Field>
            <Field label="Regular minutes">
              <input className={inputClass} name="regularMinutes" type="number" defaultValue={480} />
            </Field>
            <Field label="OT minutes">
              <input className={inputClass} name="otMinutes" type="number" defaultValue={0} />
            </Field>
            <Field label="Late minutes">
              <input className={inputClass} name="lateMinutes" type="number" defaultValue={0} />
            </Field>
            <Field label="Undertime minutes">
              <input className={inputClass} name="undertimeMinutes" type="number" defaultValue={0} />
            </Field>
            <Field label="ND minutes">
              <input className={inputClass} name="ndMinutes" type="number" defaultValue={0} />
            </Field>
            <Field label="Reason">
              <input className={inputClass} name="reason" required />
            </Field>
            <div className="md:col-span-3">
              <Button type="submit">Save adjustment</Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
