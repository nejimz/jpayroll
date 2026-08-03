import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { deleteDepartmentAction, upsertDepartmentAction } from "../actions/hr";
import { Button, Card, Field, inputClass, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function DepartmentsPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN"].includes(user.role)) redirect("/dashboard");
  const departments = await prisma.department.findMany({
    where: { companyId: user.companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: true } } },
  });

  return (
    <div>
      <PageHeader title="Departments" subtitle="Company departments for employee assignment." />
      <Card className="mb-6">
        <form action={upsertDepartmentAction} className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-3">
            <Field label="Name">
              <input className={inputClass} name="name" required placeholder="e.g. Operations" />
            </Field>
          </div>
          <div className="flex items-end">
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Card>
      <Card>
        <ul className="divide-y divide-[var(--border)]">
          {departments.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <form action={upsertDepartmentAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={d.id} />
                <input className={`${inputClass} min-w-[12rem] flex-1`} name="name" required defaultValue={d.name} />
                <Button type="submit" variant="secondary">
                  Save
                </Button>
              </form>
              <span className="text-[var(--muted)]">{d._count.employees} employees</span>
              <form action={deleteDepartmentAction}>
                <input type="hidden" name="id" value={d.id} />
                <Button type="submit" variant="secondary" disabled={d._count.employees > 0}>
                  Delete
                </Button>
              </form>
            </li>
          ))}
          {departments.length === 0 && (
            <li className="py-2 text-sm text-[var(--muted)]">No departments yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
