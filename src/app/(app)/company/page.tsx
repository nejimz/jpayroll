import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { updateCompanyAction } from "../actions/hr";
import {
  Button,
  Card,
  Field,
  FormSection,
  inputClass,
  PageHeader,
  SectionLabel,
} from "@/components/ui";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { parseClientIpFromHeaders } from "@/domain/kiosk";

export default async function CompanyPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN"].includes(user.role)) redirect("/dashboard");
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const h = await headers();
  const currentIp = parseClientIpFromHeaders(h);

  return (
    <div className="space-y-8">
      <PageHeader title="Company settings" subtitle="Employer numbers appear on payslips." />

      <Card>
        <form action={updateCompanyAction} className="space-y-0">
          <FormSection title="Employer identity" columns={2} divided={false}>
            <Field label="Name">
              <input className={inputClass} name="name" defaultValue={company.name} required />
            </Field>
            <Field label="TIN">
              <input className={inputClass} name="tin" defaultValue={company.tin ?? ""} />
            </Field>
            <Field label="SSS employer no.">
              <input
                className={inputClass}
                name="sssEmployerNo"
                defaultValue={company.sssEmployerNo ?? ""}
              />
            </Field>
            <Field label="PhilHealth employer no.">
              <input
                className={inputClass}
                name="philhealthEmployerNo"
                defaultValue={company.philhealthEmployerNo ?? ""}
              />
            </Field>
            <Field label="Pag-IBIG employer no.">
              <input
                className={inputClass}
                name="pagibigEmployerNo"
                defaultValue={company.pagibigEmployerNo ?? ""}
              />
            </Field>
            <Field label="Cut-off pattern">
              <select className={inputClass} name="cutoffPattern" defaultValue={company.cutoffPattern}>
                <option value="SEMI_MONTHLY">Semi-monthly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </Field>
          </FormSection>

          <FormSection
            title="Clock capture"
            description="Phase 1 flags only."
            columns={2}
            divided={false}
          >
            <label className="flex min-h-10 items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="requireGeo" defaultChecked={company.requireGeo} />
              Require geolocation on clock
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="requireIp" defaultChecked={company.requireIp} />
              Capture IP on clock
            </label>
          </FormSection>

          <section className="pt-5">
            <SectionLabel>Shared kiosk</SectionLabel>
            <p className="mb-4 text-sm text-muted">
              Public <code className="text-foreground">/kiosk</code> punches via badge scan. Only
              allowlisted IPs can punch (no login).
            </p>
            <label className="mb-3 flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" name="kioskEnabled" defaultChecked={company.kioskEnabled} />
              Enable shared kiosk
            </label>
            <Field label="Allowed kiosk IPs (one per line or comma-separated)">
              <textarea
                className={inputClass}
                name="kioskAllowedIps"
                rows={4}
                defaultValue={company.kioskAllowedIps.join("\n")}
                placeholder={"127.0.0.1\n203.0.113.10"}
              />
            </Field>
            <p className="mt-1 text-sm text-muted">
              Your current request IP:{" "}
              <span className="font-medium text-foreground">{currentIp ?? "unknown"}</span>
            </p>
          </section>

          <div className="pt-6">
            <Button type="submit" size="lg">
              Save settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
