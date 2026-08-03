import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { saveContributionTableAction, saveTaxTableAction } from "../actions/payroll";
import {
  Banner,
  Button,
  Card,
  Field,
  FormSection,
  inputClass,
  PageHeader,
  SectionLabel,
  StatusPill,
} from "@/components/ui";
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
    <div className="space-y-8">
      <PageHeader
        title="Contribution & tax tables"
        subtitle="Verify rates against current BIR/SSS/PhilHealth/Pag-IBIG circulars before production."
      />

      <div className="overflow-hidden rounded-[var(--radius)] border border-warning/30">
        <Banner tone="warning" className="border-b-0 px-4 py-3 text-sm md:px-4">
          Seeded tables are illustrative only — not legal advice. Confirm effectivity dates before
          running production payroll.
        </Banner>
      </div>

      <section>
        <SectionLabel>Current contribution tables</SectionLabel>
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
          {contrib.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <span>
                <span className="font-medium">{c.type}</span>
                <span className="text-muted">
                  {" "}
                  · from {c.effectiveFrom.toISOString().slice(0, 10)}
                  {c.effectiveTo ? ` to ${c.effectiveTo.toISOString().slice(0, 10)}` : ""}
                </span>
              </span>
              {!c.effectiveTo ? <StatusPill tone="accent">Open</StatusPill> : null}
            </li>
          ))}
          {contrib.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted">No contribution tables.</li>
          ) : null}
        </ul>
      </section>

      <section>
        <SectionLabel>Current tax tables</SectionLabel>
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
          {tax.map((t) => (
            <li key={t.id} className="px-4 py-3 text-sm">
              <span className="font-medium">{t.name}</span>
              <span className="text-muted">
                {" "}
                · from {t.effectiveFrom.toISOString().slice(0, 10)}
              </span>
            </li>
          ))}
          {tax.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted">No tax tables.</li>
          ) : null}
        </ul>
      </section>

      <section>
        <SectionLabel>Add contribution table</SectionLabel>
        <Card>
          <form action={saveContributionTableAction} className="space-y-0">
            <FormSection title="Metadata" columns={2}>
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
            </FormSection>
            <FormSection title="Brackets" description="JSON array of brackets." columns={2}>
              <div className="sm:col-span-2">
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
              </div>
            </FormSection>
            <div className="border-t border-border pt-4">
              <Button type="submit">Save contribution table</Button>
            </div>
          </form>
        </Card>
      </section>

      <section>
        <SectionLabel>Add tax table</SectionLabel>
        <Card>
          <form action={saveTaxTableAction} className="space-y-0">
            <FormSection title="Metadata" columns={2}>
              <Field label="Name">
                <input className={inputClass} name="name" required />
              </Field>
              <Field label="Effective from">
                <input className={inputClass} name="effectiveFrom" type="date" required />
              </Field>
            </FormSection>
            <FormSection title="Brackets" columns={2}>
              <div className="sm:col-span-2">
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
              </div>
            </FormSection>
            <div className="border-t border-border pt-4">
              <Button type="submit">Save tax table</Button>
            </div>
          </form>
        </Card>
      </section>
    </div>
  );
}
