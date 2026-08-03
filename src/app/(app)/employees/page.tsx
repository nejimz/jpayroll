import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPhp } from "@/lib/money";
import { upsertEmployeeAction } from "../actions/hr";
import { Button, Card, Field, inputClass, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function EmployeesPage() {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN"].includes(user.role)) redirect("/dashboard");
  const employees = await prisma.employee.findMany({
    where: { companyId: user.companyId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div>
      <PageHeader title="Employees" subtitle="Master data with statutory IDs and rates (centavos stored)." />
      <Card className="mb-6">
        <h2 className="mb-3 font-medium">Add employee</h2>
        <form action={upsertEmployeeAction} className="grid gap-3 md:grid-cols-4">
          <Field label="Employee No">
            <input className={inputClass} name="employeeNo" required />
          </Field>
          <Field label="First name">
            <input className={inputClass} name="firstName" required />
          </Field>
          <Field label="Middle name">
            <input className={inputClass} name="middleName" />
          </Field>
          <Field label="Last name">
            <input className={inputClass} name="lastName" required />
          </Field>
          <Field label="Suffix">
            <input className={inputClass} name="suffix" placeholder="Jr., Sr., III" />
          </Field>
          <Field label="Hire date">
            <input className={inputClass} name="hireDate" type="date" required />
          </Field>
          <Field label="Pay type">
            <select className={inputClass} name="payType" defaultValue="MONTHLY">
              <option value="MONTHLY">Monthly</option>
              <option value="DAILY">Daily</option>
              <option value="HOURLY">Hourly</option>
            </select>
          </Field>
          <Field label="Basic rate (PHP)">
            <input className={inputClass} name="basicRatePesos" required placeholder="25000" />
          </Field>
          <Field label="Department">
            <input className={inputClass} name="department" />
          </Field>
          <Field label="TIN">
            <input className={inputClass} name="tin" />
          </Field>
          <Field label="SSS">
            <input className={inputClass} name="sssNumber" />
          </Field>
          <Field label="PhilHealth">
            <input className={inputClass} name="philhealthNumber" />
          </Field>
          <Field label="Pag-IBIG">
            <input className={inputClass} name="pagibigNumber" />
          </Field>
          <div className="md:col-span-4">
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="py-2">No</th>
                <th>First</th>
                <th>Middle</th>
                <th>Last</th>
                <th>Suffix</th>
                <th>Status</th>
                <th>Pay</th>
                <th>Rate</th>
                <th>SSS</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-t border-[var(--border)]">
                  <td className="py-2">{e.employeeNo}</td>
                  <td>{e.firstName}</td>
                  <td>{e.middleName ?? "—"}</td>
                  <td>{e.lastName}</td>
                  <td>{e.suffix ?? "—"}</td>
                  <td>{e.status}</td>
                  <td>{e.payType}</td>
                  <td>{formatPhp(e.basicRateCentavos)}</td>
                  <td>{e.sssNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
