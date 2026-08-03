import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { deleteDepartmentAction, upsertDepartmentAction } from "../actions/hr";
import {
  Button,
  Card,
  EmptyState,
  Field,
  inputClass,
  PageHeader,
  SectionLabel,
} from "@/components/ui";
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
    <div className="space-y-8">
      <PageHeader title="Departments" subtitle="Company departments for employee assignment." />

      <section>
        <SectionLabel>Add department</SectionLabel>
        <Card>
          <form action={upsertDepartmentAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Name">
              <input className={inputClass} name="name" required placeholder="e.g. Operations" />
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="min-h-10 w-full sm:w-auto">
                Add
              </Button>
            </div>
          </form>
        </Card>
      </section>

      <section>
        <SectionLabel>Directory</SectionLabel>
        {departments.length === 0 ? (
          <Card padded={false}>
            <EmptyState title="No departments yet" description="Add the first department above." />
          </Card>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
            {departments.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <form
                  action={upsertDepartmentAction}
                  className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center"
                >
                  <input type="hidden" name="id" value={d.id} />
                  <input
                    className={`${inputClass} min-w-0 flex-1`}
                    name="name"
                    required
                    defaultValue={d.name}
                  />
                  <Button type="submit" variant="secondary" className="min-h-10">
                    Save
                  </Button>
                </form>
                <span className="shrink-0 text-sm text-muted">{d._count.employees} employees</span>
                <form action={deleteDepartmentAction}>
                  <input type="hidden" name="id" value={d.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    className="min-h-10 text-danger hover:bg-danger-soft hover:text-danger"
                    disabled={d._count.employees > 0}
                  >
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
