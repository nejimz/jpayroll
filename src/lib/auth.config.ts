import type { NextAuthConfig } from "next-auth";

type AppRole = "EMPLOYEE" | "MANAGER" | "HR" | "FINANCE" | "ADMIN";

/**
 * Edge-safe Auth.js config (no Prisma, bcrypt, or Node-only imports).
 * Used by middleware. Full providers live in auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  session: { strategy: "jwt" as const },
  trustHost: true,
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isLoggedIn = !!auth?.user;
      const isPublic = path.startsWith("/login") || path.startsWith("/api/auth");

      if (isPublic) {
        if (isLoggedIn && path.startsWith("/login")) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          role: AppRole;
          companyId: string;
          employeeId?: string | null;
          id: string;
        };
        token.role = u.role;
        token.companyId = u.companyId;
        token.employeeId = u.employeeId;
        token.sub = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as AppRole;
        session.user.companyId = token.companyId as string;
        session.user.employeeId = token.employeeId as string | null | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
