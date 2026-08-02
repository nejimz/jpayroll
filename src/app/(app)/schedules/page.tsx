import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { assignScheduleAction, upsertScheduleAction } from "../actions/hr";
import { Button, Card, Field, inputClass, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function SchedulesPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN"].includes(user.role)) redirect("/dashboard");
  const [schedules, employees] = await Promise.all([
    prisma.schedule.findMany({ where: { companyId: user.companyId }, include: { assignments: true } }),
    prisma.employee.findMany({ where: { companyId: user.companyId, status: "ACTIVE" }, orderBy: { employeeNo: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Schedules" subtitle="Workdays, grace, break, and night differential window." />
      <Card className="mb-6">
        <h2 className="mb-3 font-medium">New schedule</h2>
        <form action={upsertScheduleAction} className="grid gap-3 md:grid-cols-3">
          <Field label="Name">
            <input className={inputClass} name="name" required />
          </Field>
          <Field label="Workdays (0=Sun..6=Sat)">
            <input className={inputClass} name="workdays" defaultValue="1,2,3,4,5" />
          </Field>
          <Field label="Rest days">
            <input className={inputClass} name="restDays" defaultValue="0,6" />
          </Field>
          <Field label="Start">
            <input className={inputClass} name="startTime" defaultValue="09:00" />
          </Field>
          <Field label="End">
            <input className={inputClass} name="endTime" defaultValue="18:00" />
          </Field>
          <Field label="Break minutes">
            <input className={inputClass} name="breakMinutes" type="number" defaultValue={60} />
          </Field>
          <Field label="Grace minutes">
            <input className={inputClass} name="graceMinutes" type="number" defaultValue={5} />
          </Field>
          <div className="md:col-span-3">
            <Button type="submit">Save schedule</Button>
          </div>
        </form>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-medium">Assign schedule</h2>
        <form action={assignScheduleAction} className="grid gap-3 md:grid-cols-4">
          <Field label="Employee">
            <select className={inputClass} name="employeeId" required>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employeeNo} — {e.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Schedule">
            <select className={inputClass} name="scheduleId" required>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Effective from">
            <input className={inputClass} name="effectiveFrom" type="date" required />
          </Field>
          <div className="flex items-end">
            <Button type="submit">Assign</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-3">
        {schedules.map((s) => (
          <Card key={s.id}>
            <p className="font-medium">{s.name}</p>
            <p className="text-sm text-[var(--muted)]">
              {s.startTime}–{s.endTime} · break {s.breakMinutes}m · grace {s.graceMinutes}m · workdays [
              {s.workdays.join(",")}] · assignments {s.assignments.length}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
