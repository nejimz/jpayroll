import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { deleteHolidayAction, upsertHolidayAction } from "../actions/hr";
import { Button, Card, Field, inputClass, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function HolidaysPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN"].includes(user.role)) redirect("/dashboard");
  const holidays = await prisma.holiday.findMany({
    where: { companyId: user.companyId },
    orderBy: { date: "asc" },
  });

  return (
    <div>
      <PageHeader title="Holiday calendar" subtitle="Legal, special, and company holidays (Manila dates)." />
      <Card className="mb-6">
        <form action={upsertHolidayAction} className="grid gap-3 md:grid-cols-4">
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
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Card>
      <Card>
        <ul className="divide-y divide-[var(--border)]">
          {holidays.map((h) => (
            <li key={h.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {h.date.toISOString().slice(0, 10)} · {h.name} · {h.type}
              </span>
              <form action={deleteHolidayAction}>
                <input type="hidden" name="id" value={h.id} />
                <Button type="submit" variant="secondary">
                  Delete
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
