import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/rbac";
import { requireRoles } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name!,
    role: session.user.role,
    companyId: session.user.companyId,
    employeeId: session.user.employeeId,
  };
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  if (roles) return requireRoles(user, roles);
  return user;
}
