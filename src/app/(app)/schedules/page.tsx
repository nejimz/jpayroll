import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEmployeeName } from "@/lib/employee-name";
import { assignScheduleAction, upsertScheduleAction } from "../actions/hr";
import {
  Button,
  Card,
  EmptyState,
  Field,
  FormSection,
  inputClass,
  PageHeader,
  SectionLabel,
} from "@/components/ui";
import { redirect } from "next/navigation";

export default async function SchedulesPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN"].includes(user.role)) redirect("/dashboard");
  const [schedules, employees] = await Promise.all([
    prisma.schedule.findMany({
      where: { companyId: user.companyId },
      include: { assignments: true },
    }),
    prisma.employee.findMany({
      where: { companyId: user.companyId, status: "ACTIVE" },
      orderBy: { employeeNo: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Schedules"
        subtitle="Workdays, grace, break, and night differential window."
      />

      <section>
        <SectionLabel>New schedule</SectionLabel>
        <Card>
          <form action={upsertScheduleAction} className="space-y-0">
            <FormSection title="Basics" columns={3} divided={false}>
              <Field label="Name">
                <input className={inputClass} name="name" required />
              </Field>
              <Field label="Workdays (0=Sun..6=Sat)">
                <input className={inputClass} name="workdays" defaultValue="1,2,3,4,5" />
              </Field>
              <Field label="Rest days">
                <input className={inputClass} name="restDays" defaultValue="0,6" />
              </Field>
            </FormSection>
            <FormSection title="Hours" columns={4} divided={false}>
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
            </FormSection>
            <div className="pt-6">
              <Button type="submit">Save schedule</Button>
            </div>
          </form>
        </Card>
      </section>

      <section>
        <SectionLabel>Assign schedule</SectionLabel>
        <Card>
          <form action={assignScheduleAction} className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Field label="Employee">
              <select className={inputClass} name="employeeId" required>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employeeNo} — {formatEmployeeName(e)}
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
              <Button type="submit" className="min-h-10 w-full md:w-auto">
                Assign
              </Button>
            </div>
          </form>
        </Card>
      </section>

      <section>
        <SectionLabel>Schedules</SectionLabel>
        {schedules.length === 0 ? (
          <Card padded={false}>
            <EmptyState title="No schedules" description="Create a schedule above." />
          </Card>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
            {schedules.map((s) => (
              <li key={s.id} className="px-4 py-3.5">
                <p className="font-medium">{s.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {s.startTime}–{s.endTime} · break {s.breakMinutes}m · grace {s.graceMinutes}m ·
                  workdays [{s.workdays.join(",")}] · {s.assignments.length} assignment
                  {s.assignments.length === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
