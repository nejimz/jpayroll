import { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
  employeeId?: string | null;
};

const roleRank: Record<Role, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  HR: 3,
  FINANCE: 3,
  ADMIN: 4,
};

export function hasRole(user: SessionUser | null | undefined, allowed: Role[]): boolean {
  if (!user) return false;
  return allowed.includes(user.role);
}

export function requireRoles(user: SessionUser | null | undefined, allowed: Role[]): SessionUser {
  if (!hasRole(user, allowed)) {
    throw new Error("Forbidden");
  }
  return user!;
}

export function canManagePayroll(user: SessionUser): boolean {
  return hasRole(user, ["HR", "ADMIN", "FINANCE"]);
}

export function canEditMasterData(user: SessionUser): boolean {
  return hasRole(user, ["HR", "ADMIN"]);
}

export function canFinalizePayroll(user: SessionUser): boolean {
  return hasRole(user, ["HR", "FINANCE", "ADMIN"]);
}

export function isAtLeast(user: SessionUser, role: Role): boolean {
  return roleRank[user.role] >= roleRank[role];
}
