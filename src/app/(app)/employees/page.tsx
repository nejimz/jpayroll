import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { centavosToPesos, formatPhp } from "@/lib/money";
import { formatEmployeeName } from "@/lib/employee-name";
import { upsertEmployeeAction } from "../actions/hr";
import {
  Button,
  Card,
  Field,
  FormSection,
  inputClass,
  PageHeader,
  StatusPill,
  StatTile,
} from "@/components/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import {
  ChevronLeft,
  ChevronRight,
  IdCard,
  Pencil,
  Plus,
  Save,
  Search,
  UserRoundX,
  X,
} from "lucide-react";

const PAGE_SIZE = 10;

function toDateInput(d: Date | null | undefined) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function payLabel(payType: string) {
  if (payType === "DAILY") return "Daily";
  if (payType === "HOURLY") return "Hourly";
  return "Monthly";
}

function directoryHref(params: {
  q?: string;
  page?: number;
  edit?: string;
}) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.edit) sp.set("edit", params.edit);
  const qs = sp.toString();
  return qs ? `/employees?${qs}` : "/employees";
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !["HR", "ADMIN"].includes(user.role)) redirect("/dashboard");
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const requestedPage = Math.max(1, Number(sp.page) || 1);

  const searchFilter: Prisma.EmployeeWhereInput = q
    ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { middleName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { employeeNo: { contains: q, mode: "insensitive" } },
          { badgeCode: { contains: q, mode: "insensitive" } },
          { sssNumber: { contains: q, mode: "insensitive" } },
          { department: { name: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  const directoryWhere: Prisma.EmployeeWhereInput = {
    companyId: user.companyId,
    ...searchFilter,
  };

  const [
    totalHeadcount,
    activeCount,
    matchedCount,
    departments,
    editingEmployee,
  ] = await Promise.all([
    prisma.employee.count({ where: { companyId: user.companyId } }),
    prisma.employee.count({ where: { companyId: user.companyId, status: "ACTIVE" } }),
    prisma.employee.count({ where: directoryWhere }),
    prisma.department.findMany({
      where: { companyId: user.companyId },
      orderBy: { name: "asc" },
    }),
    sp.edit
      ? prisma.employee.findFirst({
          where: { id: sp.edit, companyId: user.companyId },
          include: { department: true },
        })
      : Promise.resolve(null),
  ]);

  const inactiveCount = totalHeadcount - activeCount;
  const totalPages = Math.max(1, Math.ceil(matchedCount / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * PAGE_SIZE;

  const employees = await prisma.employee.findMany({
    where: directoryWhere,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { department: true },
    skip,
    take: PAGE_SIZE,
  });

  const editing = editingEmployee ?? undefined;
  const rangeStart = matchedCount === 0 ? 0 : skip + 1;
  const rangeEnd = Math.min(skip + employees.length, matchedCount);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        subtitle="People, pay rates, and statutory IDs for this company."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/id-cards"
              className="focus-ring inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted transition hover:border-accent hover:text-accent"
            >
              <IdCard className="h-4 w-4" aria-hidden />
              Print ID cards
            </Link>
            {editing ? (
              <Link
                href={directoryHref({ q, page })}
                className="focus-ring inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted transition hover:border-accent hover:text-accent"
              >
                <X className="h-4 w-4" aria-hidden />
                Cancel edit
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Headcount" value={totalHeadcount} />
        <StatTile label="Active" value={<span className="text-accent">{activeCount}</span>} />
        <StatTile label="Inactive" value={inactiveCount} />
      </div>

      <Card padded={false} className="overflow-hidden">
        <div
          className={`border-b border-[var(--border)] px-5 py-4 ${
            editing ? "bg-[var(--accent-soft)]/60" : ""
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {editing ? "Editing record" : "New record"}
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-tight">
            {editing
              ? `${editing.employeeNo} · ${formatEmployeeName(editing)}`
              : "Add employee"}
          </h2>
        </div>

        <form action={upsertEmployeeAction} className="space-y-0 px-5 py-5">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <FormSection
            title="Identity"
            description="Photo, badge, and legal name as shown on payslips and ID cards."
            divided={false}
          >
            <div className="sm:col-span-2 lg:col-span-4">
              <Field label="Photo">
                <div className="flex flex-wrap items-center gap-4">
                  {editing?.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editing.photoUrl}
                      alt=""
                      className="h-16 w-16 rounded-full object-cover ring-1 ring-[var(--border)]"
                    />
                  ) : (
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]"
                      aria-hidden
                    >
                      {editing
                        ? initials(editing.firstName, editing.lastName)
                        : "Photo"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      className={inputClass}
                      name="photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                    />
                    <p className="text-xs text-[var(--muted)]">
                      JPEG, PNG, or WebP · max 2&nbsp;MB
                    </p>
                    {editing?.photoUrl ? (
                      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <input type="checkbox" name="removePhoto" className="accent-[var(--accent)]" />
                        Remove current photo
                      </label>
                    ) : null}
                  </div>
                </div>
              </Field>
            </div>
            <div className="sm:col-span-1">
              <Field label="Employee No">
                <input
                  className={inputClass}
                  name="employeeNo"
                  required
                  defaultValue={editing?.employeeNo ?? ""}
                />
              </Field>
            </div>
            <div className="sm:col-span-1 lg:col-span-3">
              <Field label="Badge code">
                <input
                  className={inputClass}
                  name="badgeCode"
                  placeholder="RFID / barcode / QR payload"
                  defaultValue={editing?.badgeCode ?? ""}
                />
              </Field>
            </div>
            <Field label="First name">
              <input
                className={inputClass}
                name="firstName"
                required
                defaultValue={editing?.firstName ?? ""}
              />
            </Field>
            <Field label="Middle name">
              <input
                className={inputClass}
                name="middleName"
                defaultValue={editing?.middleName ?? ""}
              />
            </Field>
            <Field label="Last name">
              <input
                className={inputClass}
                name="lastName"
                required
                defaultValue={editing?.lastName ?? ""}
              />
            </Field>
            <Field label="Suffix">
              <input
                className={inputClass}
                name="suffix"
                placeholder="Jr., Sr., III"
                defaultValue={editing?.suffix ?? ""}
              />
            </Field>
          </FormSection>

          <FormSection
            title="Employment"
            description="Status drives clock, kiosk, and payroll eligibility."
            divided={false}
          >
            <Field label="Hire date">
              <input
                className={inputClass}
                name="hireDate"
                type="date"
                required
                defaultValue={toDateInput(editing?.hireDate)}
              />
            </Field>
            <Field label="End date">
              <input
                className={inputClass}
                name="endDate"
                type="date"
                defaultValue={toDateInput(editing?.endDate)}
              />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                name="status"
                defaultValue={editing?.status ?? "ACTIVE"}
              >
                <option value="ACTIVE">Active</option>
                <option value="SEPARATED">Inactive</option>
              </select>
            </Field>
            <Field label="Department">
              <select
                className={inputClass}
                name="departmentId"
                defaultValue={editing?.departmentId ?? ""}
              >
                <option value="">Unassigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          </FormSection>

          <FormSection
            title="Compensation"
            description="Basic rate in PHP; stored as centavos."
            divided={false}
          >
            <Field label="Pay type">
              <select
                className={inputClass}
                name="payType"
                defaultValue={editing?.payType ?? "MONTHLY"}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="DAILY">Daily</option>
                <option value="HOURLY">Hourly</option>
              </select>
            </Field>
            <Field label="Basic rate (PHP)">
              <input
                className={inputClass}
                name="basicRatePesos"
                required
                placeholder="25000"
                defaultValue={editing ? String(centavosToPesos(editing.basicRateCentavos)) : ""}
              />
            </Field>
          </FormSection>

          <FormSection
            title="Statutory IDs"
            description="Optional now; payroll warns if missing."
            divided={false}
          >
            <Field label="TIN">
              <input className={inputClass} name="tin" defaultValue={editing?.tin ?? ""} />
            </Field>
            <Field label="SSS">
              <input
                className={inputClass}
                name="sssNumber"
                defaultValue={editing?.sssNumber ?? ""}
              />
            </Field>
            <Field label="PhilHealth">
              <input
                className={inputClass}
                name="philhealthNumber"
                defaultValue={editing?.philhealthNumber ?? ""}
              />
            </Field>
            <Field label="Pag-IBIG">
              <input
                className={inputClass}
                name="pagibigNumber"
                defaultValue={editing?.pagibigNumber ?? ""}
              />
            </Field>
          </FormSection>

          <div className="flex flex-wrap items-center gap-3 pt-6">
            <Button type="submit" className="min-w-[8.5rem]">
              {editing ? (
                <>
                  <Save className="h-4 w-4" aria-hidden />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden />
                  Create employee
                </>
              )}
            </Button>
            {editing ? (
              <Link
                href={directoryHref({ q, page })}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--accent)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Discard
              </Link>
            ) : (
              <p className="text-xs text-[var(--muted)]">
                New hires default to Active and appear in payroll runs.
              </p>
            )}
          </div>
        </form>
      </Card>

      <Card padded={false} className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl tracking-tight">
                Directory
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {matchedCount === 0
                  ? q
                    ? "No matches"
                    : "No employees yet"
                  : `Showing ${rangeStart}–${rangeEnd} of ${matchedCount}`}
                {q ? ` · “${q}”` : ""} · sorted by last name
              </p>
            </div>

            <form method="get" action="/employees" className="flex w-full max-w-md flex-wrap items-center gap-2 sm:w-auto">
              {editing ? <input type="hidden" name="edit" value={editing.id} /> : null}
              <label className="sr-only" htmlFor="employee-search">
                Search employees
              </label>
              <div className="relative min-w-[12rem] flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                  aria-hidden
                />
                <input
                  id="employee-search"
                  className={`${inputClass} pl-9`}
                  name="q"
                  type="search"
                  placeholder="Search name, no, badge, dept…"
                  defaultValue={q}
                />
              </div>
              <Button type="submit" variant="secondary">
                <Search className="h-4 w-4" aria-hidden />
                Search
              </Button>
              {q ? (
                <Link
                  href={directoryHref({ edit: editing?.id })}
                  className="inline-flex items-center gap-1 text-sm text-[var(--muted)] transition hover:text-[var(--accent)]"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Clear
                </Link>
              ) : null}
            </form>
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-sm text-[var(--muted)]">
            <UserRoundX className="h-8 w-8 opacity-40" aria-hidden />
            <p>
              {q
                ? "No employees match that search. Try another name, number, or department."
                : "No employees yet. Create the first record above."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {employees.map((e) => {
              const active = e.status === "ACTIVE";
              const isEditing = editing?.id === e.id;
              return (
                <li
                  key={e.id}
                  className={`group transition ${
                    isEditing ? "bg-[var(--accent-soft)]/50" : "hover:bg-[var(--background)]/80"
                  } ${!active ? "opacity-70" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold ${
                        active
                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "bg-[var(--background)] text-[var(--muted)] ring-1 ring-[var(--border)]"
                      }`}
                      aria-hidden
                    >
                      {e.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(e.firstName, e.lastName)
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate font-medium tracking-tight">
                          {formatEmployeeName(e)}
                        </p>
                        <StatusPill tone={active ? "accent" : "neutral"} dot>
                          {active ? "Active" : "Inactive"}
                        </StatusPill>
                      </div>
                      <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-[var(--muted)]">
                        <span className="font-medium text-[var(--foreground)]/70">
                          {e.employeeNo}
                        </span>
                        <span aria-hidden>·</span>
                        <span>{e.department?.name ?? "No department"}</span>
                        <span aria-hidden>·</span>
                        <span>
                          {payLabel(e.payType)} · {formatPhp(e.basicRateCentavos)}
                        </span>
                        {e.badgeCode ? (
                          <>
                            <span aria-hidden>·</span>
                            <span className="font-mono">{e.badgeCode}</span>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <div className="ml-auto flex items-center gap-3 text-xs text-[var(--muted)]">
                      <div className="hidden text-right sm:block">
                        <p>SSS {e.sssNumber ?? "—"}</p>
                        <p className="mt-0.5">Hired {toDateInput(e.hireDate)}</p>
                      </div>
                      {e.badgeCode ? (
                        <a
                          href={`/api/id-cards/pdf?ids=${e.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          title="Download ID card PDF"
                        >
                          <IdCard className="h-3.5 w-3.5" aria-hidden />
                          Print ID
                        </a>
                      ) : null}
                      <Link
                        href={directoryHref({ q, page, edit: e.id })}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Edit
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {matchedCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3">
            <p className="text-xs text-[var(--muted)]">
              Page {page} of {totalPages} · {PAGE_SIZE} per page
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={directoryHref({ q, page: page - 1, edit: editing?.id })}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Previous
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] opacity-50">
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Previous
                </span>
              )}
              {page < totalPages ? (
                <Link
                  href={directoryHref({ q, page: page + 1, edit: editing?.id })}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] opacity-50">
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </span>
              )}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
