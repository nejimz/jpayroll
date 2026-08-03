import type { SessionUser } from "@/lib/rbac";
import { hasRole } from "@/lib/rbac";

export type NavItem = {
  href: string;
  label: string;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

type NavItemDef = NavItem & {
  show: (user: SessionUser) => boolean;
};

type NavSectionDef = {
  id: string;
  label: string;
  items: NavItemDef[];
};

const NAV_SECTION_DEFS: NavSectionDef[] = [
  {
    id: "me",
    label: "Me",
    items: [
      { href: "/clock", label: "Clock", show: (u) => Boolean(u.employeeId) },
      { href: "/timesheet", label: "My timesheet", show: (u) => Boolean(u.employeeId) },
      {
        href: "/payslips",
        label: "Payslips",
        show: (u) => Boolean(u.employeeId) || hasRole(u, ["HR", "ADMIN", "FINANCE"]),
      },
      {
        href: "/corrections",
        label: "Corrections",
        show: (u) => hasRole(u, ["HR", "ADMIN", "MANAGER"]) || Boolean(u.employeeId),
      },
    ],
  },
  {
    id: "team",
    label: "Team",
    items: [
      { href: "/team", label: "Team", show: (u) => hasRole(u, ["MANAGER", "HR", "ADMIN"]) },
    ],
  },
  {
    id: "payroll",
    label: "Payroll",
    items: [
      { href: "/periods", label: "Periods", show: (u) => hasRole(u, ["HR", "ADMIN", "FINANCE"]) },
      { href: "/payroll", label: "Payroll", show: (u) => hasRole(u, ["HR", "ADMIN", "FINANCE"]) },
      {
        href: "/reports",
        label: "Reports",
        show: (u) => hasRole(u, ["HR", "ADMIN", "FINANCE", "MANAGER"]),
      },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    items: [
      { href: "/employees", label: "Employees", show: (u) => hasRole(u, ["HR", "ADMIN"]) },
      { href: "/departments", label: "Departments", show: (u) => hasRole(u, ["HR", "ADMIN"]) },
      { href: "/schedules", label: "Schedules", show: (u) => hasRole(u, ["HR", "ADMIN"]) },
      { href: "/holidays", label: "Holidays", show: (u) => hasRole(u, ["HR", "ADMIN"]) },
      { href: "/tables", label: "Tax tables", show: (u) => hasRole(u, ["HR", "ADMIN"]) },
      { href: "/company", label: "Company", show: (u) => hasRole(u, ["ADMIN", "HR"]) },
    ],
  },
];

/** Role-filtered nav sections; empty sections are omitted. */
export function getNavSections(user: SessionUser): NavSection[] {
  return NAV_SECTION_DEFS.map((section) => ({
    id: section.id,
    label: section.label,
    items: section.items.filter((item) => item.show(user)).map(({ href, label }) => ({ href, label })),
  })).filter((section) => section.items.length > 0);
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
