import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/rbac";
import { requireRoles } from "@/lib/rbac";
import type { Role } from "@prisma/client";

/**
 * Resolve the signed-in user from the DB so JWT claims stay valid after
 * reseed / user updates (companyId, employeeId, role can change).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) return null;

  let dbUser = session.user.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;

  // After db:seed, JWT may still hold a deleted user id — resolve by email.
  if (!dbUser && session.user.email) {
    dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  }

  if (!dbUser) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    companyId: dbUser.companyId,
    employeeId: dbUser.employeeId,
  };
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  if (roles) return requireRoles(user, roles);
  return user;
}
