import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { updateCompanyAction } from "../actions/hr";
import { Button, Card, Field, inputClass, PageHeader } from "@/components/ui";
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

          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <h2 className="mb-2 font-medium">Shared kiosk</h2>
            <p className="mb-3 text-sm text-[var(--muted)]">
              Public <code className="text-[var(--foreground)]">/kiosk</code> punches via badge scan. Only
              allowlisted IPs can punch (no login).
            </p>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input type="checkbox" name="kioskEnabled" defaultChecked={company.kioskEnabled} />
              Enable shared kiosk
            </label>
            <Field label="Allowed kiosk IPs (one per line or comma-separated)">
              <textarea
                className={inputClass}
                name="kioskAllowedIps"
                rows={4}
                defaultValue={company.kioskAllowedIps.join("\n")}
                placeholder="127.0.0.1&#10;203.0.113.10"
              />
            </Field>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Your current request IP:{" "}
              <span className="font-medium text-[var(--foreground)]">{currentIp ?? "unknown"}</span>
            </p>
          </div>

          <Button type="submit">Save</Button>
        </form>
      </Card>
    </div>
  );
}
