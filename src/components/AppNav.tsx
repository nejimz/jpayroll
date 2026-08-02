import type { SessionUser } from "@/lib/rbac";
import { hasRole } from "@/lib/rbac";
import Link from "next/link";
import { signOut } from "@/lib/auth";

export function AppNav({ user }: { user: SessionUser }) {
  const links: { href: string; label: string; show: boolean }[] = [
    { href: "/clock", label: "Clock", show: Boolean(user.employeeId) },
    { href: "/timesheet", label: "My timesheet", show: Boolean(user.employeeId) },
    { href: "/payslips", label: "Payslips", show: Boolean(user.employeeId) || hasRole(user, ["HR", "ADMIN", "FINANCE"]) },
    { href: "/team", label: "Team", show: hasRole(user, ["MANAGER", "HR", "ADMIN"]) },
    { href: "/employees", label: "Employees", show: hasRole(user, ["HR", "ADMIN"]) },
    { href: "/schedules", label: "Schedules", show: hasRole(user, ["HR", "ADMIN"]) },
    { href: "/holidays", label: "Holidays", show: hasRole(user, ["HR", "ADMIN"]) },
    { href: "/periods", label: "Periods", show: hasRole(user, ["HR", "ADMIN", "FINANCE"]) },
    { href: "/payroll", label: "Payroll", show: hasRole(user, ["HR", "ADMIN", "FINANCE"]) },
    { href: "/tables", label: "Tax tables", show: hasRole(user, ["HR", "ADMIN"]) },
    { href: "/reports", label: "Reports", show: hasRole(user, ["HR", "ADMIN", "FINANCE", "MANAGER"]) },
    { href: "/company", label: "Company", show: hasRole(user, ["ADMIN", "HR"]) },
    { href: "/corrections", label: "Corrections", show: hasRole(user, ["HR", "ADMIN", "MANAGER"]) || Boolean(user.employeeId) },
  ];

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <Link href="/dashboard" className="font-[family-name:var(--font-display)] text-xl tracking-tight">
            Payroll PH
          </Link>
          <p className="text-xs text-[var(--muted)]">
            {user.name} · {user.role}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm">
            Sign out
          </button>
        </form>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
        {links
          .filter((l) => l.show)
          .map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            >
              {l.label}
            </Link>
          ))}
      </nav>
    </header>
  );
}
