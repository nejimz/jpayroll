import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEmployeeName } from "@/lib/employee-name";
import { formatManilaDateTime } from "@/lib/manila";
import {
  Button,
  Card,
  EmptyState,
  Field,
  FormSection,
  inputClass,
  PageHeader,
  SectionLabel,
  StatusPill,
} from "@/components/ui";
import { redirect } from "next/navigation";
import { adjustTimesheetAction } from "../actions/attendance";

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
    <div className="space-y-8">
      <PageHeader title="Team attendance" subtitle="Exceptions and recent activity." />

      <section>
        <SectionLabel>Team</SectionLabel>
        {list.length === 0 ? (
          <Card padded={false}>
            <EmptyState title="No team members" description="Active employees will appear here." />
          </Card>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
            {list.map((e) => {
              const last = e.attendanceLogs[0];
              const unpaired = e.timesheetDays.some((d) => d.hasUnpairedPunch);
              return (
                <li
                  key={e.id}
                  className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {e.employeeNo} — {formatEmployeeName(e)}
                    </p>
                    <p className="text-sm text-muted">
                      Last:{" "}
                      {last
                        ? `${last.punchType} · ${formatManilaDateTime(last.punchedAt)}`
                        : "—"}
                    </p>
                  </div>
                  {unpaired ? (
                    <StatusPill tone="danger" dot>
                      Unpaired punch
                    </StatusPill>
                  ) : (
                    <StatusPill tone="success" dot>
                      OK
                    </StatusPill>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {["HR", "ADMIN"].includes(user.role) ? (
        <section>
          <SectionLabel>HR timesheet adjustment</SectionLabel>
          <Card>
            <form action={adjustTimesheetAction} className="space-y-0">
              <FormSection title="Who & when" columns={3} divided={false}>
                <Field label="Employee">
                  <select className={inputClass} name="employeeId" required>
                    {list.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.employeeNo} {formatEmployeeName(e)}
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
              </FormSection>
              <FormSection
                title="Minutes"
                description="Payable and exception minutes."
                columns={3}
                divided={false}
              >
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
              </FormSection>
              <div className="pt-6">
                <Button type="submit">Save adjustment</Button>
              </div>
            </form>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
