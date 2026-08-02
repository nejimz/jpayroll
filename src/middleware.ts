import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Middleware must only import the Edge-safe auth config.
 * Do not import @/lib/auth here — it pulls Prisma/bcrypt into Edge.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
