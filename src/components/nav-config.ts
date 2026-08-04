import type { SessionUser } from "@/lib/rbac";
import { hasRole } from "@/lib/rbac";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  FileText,
  IdCard,
  LayoutDashboard,
  Receipt,
  Settings2,
  Table2,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
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
      { href: "/clock", label: "Clock", icon: Clock, show: (u) => Boolean(u.employeeId) },
      {
        href: "/timesheet",
        label: "My timesheet",
        icon: ClipboardList,
        show: (u) => Boolean(u.employeeId),
      },
      {
        href: "/payslips",
        label: "Payslips",
        icon: Receipt,
        show: (u) => Boolean(u.employeeId) || hasRole(u, ["HR", "ADMIN", "FINANCE"]),
      },
      {
        href: "/corrections",
        label: "Corrections",
        icon: FileText,
        show: (u) => hasRole(u, ["HR", "ADMIN", "MANAGER"]) || Boolean(u.employeeId),
      },
    ],
  },
  {
    id: "team",
    label: "Team",
    items: [
      {
        href: "/team",
        label: "Team",
        icon: UsersRound,
        show: (u) => hasRole(u, ["MANAGER", "HR", "ADMIN"]),
      },
    ],
  },
  {
    id: "payroll",
    label: "Payroll",
    items: [
      {
        href: "/periods",
        label: "Periods",
        icon: CalendarDays,
        show: (u) => hasRole(u, ["HR", "ADMIN", "FINANCE"]),
      },
      {
        href: "/payroll",
        label: "Payroll",
        icon: Wallet,
        show: (u) => hasRole(u, ["HR", "ADMIN", "FINANCE"]),
      },
      {
        href: "/reports",
        label: "Reports",
        icon: FileSpreadsheet,
        show: (u) => hasRole(u, ["HR", "ADMIN", "FINANCE", "MANAGER"]),
      },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    items: [
      { href: "/employees", label: "Employees", icon: Users, show: (u) => hasRole(u, ["HR", "ADMIN"]) },
      {
        href: "/id-cards",
        label: "ID cards",
        icon: IdCard,
        show: (u) => hasRole(u, ["HR", "ADMIN"]),
      },
      {
        href: "/departments",
        label: "Departments",
        icon: Building2,
        show: (u) => hasRole(u, ["HR", "ADMIN"]),
      },
      {
        href: "/schedules",
        label: "Schedules",
        icon: Clock,
        show: (u) => hasRole(u, ["HR", "ADMIN"]),
      },
      {
        href: "/holidays",
        label: "Holidays",
        icon: CalendarDays,
        show: (u) => hasRole(u, ["HR", "ADMIN"]),
      },
      {
        href: "/tables",
        label: "Tax tables",
        icon: Table2,
        show: (u) => hasRole(u, ["HR", "ADMIN"]),
      },
      {
        href: "/company",
        label: "Company",
        icon: Settings2,
        show: (u) => hasRole(u, ["ADMIN", "HR"]),
      },
    ],
  },
];

export const DASHBOARD_NAV = {
  href: "/dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
} as const;

/** Role-filtered nav sections; empty sections are omitted. */
export function getNavSections(user: SessionUser): NavSection[] {
  return NAV_SECTION_DEFS.map((section) => ({
    id: section.id,
    label: section.label,
    items: section.items
      .filter((item) => item.show(user))
      .map(({ href, label, icon }) => ({ href, label, icon })),
  })).filter((section) => section.items.length > 0);
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Resolve a short page title for the mobile top bar. */
export function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/") return "Dashboard";
  const all = NAV_SECTION_DEFS.flatMap((s) => s.items);
  const exact = all.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  if (exact) return exact.label;
  return "Payroll PH";
}
