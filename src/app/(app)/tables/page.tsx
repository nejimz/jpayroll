import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { saveContributionTableAction, saveTaxTableAction } from "../actions/payroll";
import { Button, Card, Field, inputClass, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function TablesPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN"].includes(user.role)) redirect("/dashboard");
  const [contrib, tax] = await Promise.all([
    prisma.contributionTable.findMany({
      where: { companyId: user.companyId },
      orderBy: [{ type: "asc" }, { effectiveFrom: "desc" }],
    }),
    prisma.taxTable.findMany({
      where: { companyId: user.companyId },
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Contribution & tax tables"
        subtitle="Verify rates against current BIR/SSS/PhilHealth/Pag-IBIG circulars before production."
      />
      <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Seeded tables are illustrative only — not legal advice.
      </div>

      <Card className="mb-6">
        <h2 className="mb-2 font-medium">Current contribution tables</h2>
        <ul className="space-y-1 text-sm">
          {contrib.map((c) => (
            <li key={c.id}>
              {c.type} · from {c.effectiveFrom.toISOString().slice(0, 10)}
              {c.effectiveTo ? ` to ${c.effectiveTo.toISOString().slice(0, 10)}` : " (open)"}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-2 font-medium">Current tax tables</h2>
        <ul className="space-y-1 text-sm">
          {tax.map((t) => (
            <li key={t.id}>
              {t.name} · from {t.effectiveFrom.toISOString().slice(0, 10)}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-medium">Add contribution table</h2>
        <form action={saveContributionTableAction} className="grid gap-3">
          <Field label="Type">
            <select className={inputClass} name="type" defaultValue="SSS">
              <option value="SSS">SSS</option>
              <option value="PHILHEALTH">PhilHealth</option>
              <option value="PAGIBIG">Pag-IBIG</option>
            </select>
          </Field>
          <Field label="Effective from">
            <input className={inputClass} name="effectiveFrom" type="date" required />
          </Field>
          <Field label="Brackets JSON">
            <textarea
              className={inputClass}
              name="bracketsJson"
              rows={6}
              required
              defaultValue={JSON.stringify(
                [{ minCentavos: 0, maxCentavos: 999999999, eeCentavos: 0, erCentavos: 0 }],
                null,
                2
              )}
            />
          </Field>
          <Button type="submit">Save contribution table</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Add tax table</h2>
        <form action={saveTaxTableAction} className="grid gap-3">
          <Field label="Name">
            <input className={inputClass} name="name" required />
          </Field>
          <Field label="Effective from">
            <input className={inputClass} name="effectiveFrom" type="date" required />
          </Field>
          <Field label="Brackets JSON">
            <textarea
              className={inputClass}
              name="bracketsJson"
              rows={6}
              required
              defaultValue={JSON.stringify(
                [{ minCentavos: 0, maxCentavos: null, baseTaxCentavos: 0, rateOverMin: 0 }],
                null,
                2
              )}
            />
          </Field>
          <Button type="submit">Save tax table</Button>
        </form>
      </Card>
    </div>
  );
}
