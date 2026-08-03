import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { deleteHolidayAction, upsertHolidayAction } from "../actions/hr";
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

function holidayTone(type: string): "accent" | "warning" | "neutral" {
  if (type === "LEGAL") return "accent";
  if (type === "SPECIAL") return "warning";
  return "neutral";
}

export default async function HolidaysPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN"].includes(user.role)) redirect("/dashboard");
  const holidays = await prisma.holiday.findMany({
    where: { companyId: user.companyId },
    orderBy: { date: "asc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Holiday calendar"
        subtitle="Legal, special, and company holidays (Manila dates)."
      />

      <section>
        <SectionLabel>Add holiday</SectionLabel>
        <Card>
          <form action={upsertHolidayAction} className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Field label="Date">
              <input className={inputClass} name="date" type="date" required />
            </Field>
            <Field label="Name">
              <input className={inputClass} name="name" required />
            </Field>
            <Field label="Type">
              <select className={inputClass} name="type" defaultValue="LEGAL">
                <option value="LEGAL">Legal</option>
                <option value="SPECIAL">Special</option>
                <option value="COMPANY">Company</option>
              </select>
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="min-h-10 w-full md:w-auto">
                Add
              </Button>
            </div>
          </form>
        </Card>
      </section>

      <section>
        <SectionLabel>Calendar</SectionLabel>
        {holidays.length === 0 ? (
          <Card padded={false}>
            <EmptyState title="No holidays" description="Add legal and company holidays above." />
          </Card>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
            {holidays.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium tabular-nums">
                    {h.date.toISOString().slice(0, 10)}
                  </span>
                  <span>{h.name}</span>
                  <StatusPill tone={holidayTone(h.type)}>{h.type}</StatusPill>
                </div>
                <form action={deleteHolidayAction}>
                  <input type="hidden" name="id" value={h.id} />
                  <Button type="submit" variant="ghost" className="min-h-10 text-danger hover:bg-danger-soft hover:text-danger">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
