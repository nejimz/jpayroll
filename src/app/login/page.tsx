import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { loginAction } from "./actions";
import { Button, Field, inputClass } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const sp = await searchParams;

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 15% 20%, var(--accent-soft), transparent 55%),
            radial-gradient(ellipse 60% 45% at 85% 80%, #e8edf1, transparent 50%),
            var(--background)
          `,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%230f6e56' fill-opacity='0.04' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <div className="motion-fade-in mx-auto w-full max-w-md">
        <div className="mb-8 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Philippines
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-foreground sm:text-5xl">
            Payroll PH
          </h1>
          <p className="mt-2 text-sm text-muted">
            Timekeeping and payroll for your company.
          </p>
        </div>

        <form
          action={loginAction}
          className="space-y-4 rounded-[var(--radius)] border border-border bg-card/90 p-6 shadow-[var(--shadow-md)] backdrop-blur-sm"
        >
          <Field label="Email">
            <input
              className={inputClass}
              name="email"
              type="email"
              required
              autoComplete="username"
              defaultValue="staff@demo.local"
            />
          </Field>
          <Field label="Password">
            <input
              className={inputClass}
              name="password"
              type="password"
              required
              autoComplete="current-password"
              defaultValue="password123"
            />
          </Field>
          {sp.error ? <p className="text-sm text-danger">{sp.error}</p> : null}
          <Button type="submit" size="lg" className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted sm:text-left">
          Demo: admin@demo.local, hr@demo.local, finance@demo.local, staff@demo.local —
          password123
        </p>
      </div>
    </div>
  );
}
