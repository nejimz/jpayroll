import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { updateCompanyAction } from "../actions/hr";
import { Button, Card, Field, inputClass, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function CompanyPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN"].includes(user.role)) redirect("/dashboard");
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });

  return (
    <div>
      <PageHeader title="Company settings" subtitle="Employer numbers appear on payslips." />
      <Card>
        <form action={updateCompanyAction} className="grid max-w-xl gap-3">
          <Field label="Name">
            <input className={inputClass} name="name" defaultValue={company.name} required />
          </Field>
          <Field label="TIN">
            <input className={inputClass} name="tin" defaultValue={company.tin ?? ""} />
          </Field>
          <Field label="SSS employer no.">
            <input className={inputClass} name="sssEmployerNo" defaultValue={company.sssEmployerNo ?? ""} />
          </Field>
          <Field label="PhilHealth employer no.">
            <input
              className={inputClass}
              name="philhealthEmployerNo"
              defaultValue={company.philhealthEmployerNo ?? ""}
            />
          </Field>
          <Field label="Pag-IBIG employer no.">
            <input className={inputClass} name="pagibigEmployerNo" defaultValue={company.pagibigEmployerNo ?? ""} />
          </Field>
          <Field label="Cut-off pattern">
            <select className={inputClass} name="cutoffPattern" defaultValue={company.cutoffPattern}>
              <option value="SEMI_MONTHLY">Semi-monthly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="requireGeo" defaultChecked={company.requireGeo} />
            Require geolocation on clock (flag only in Phase 1)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="requireIp" defaultChecked={company.requireIp} />
            Capture IP on clock
          </label>
          <Button type="submit">Save</Button>
        </form>
      </Card>
    </div>
  );
}
