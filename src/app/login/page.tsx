import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { loginAction } from "./actions";
import { Button, Card, Field, inputClass, PageHeader } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const sp = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <PageHeader title="Payroll PH" subtitle="Philippines timekeeping and payroll" />
      <Card>
        <form action={loginAction} className="space-y-4">
          <Field label="Email">
            <input className={inputClass} name="email" type="email" required defaultValue="staff@demo.local" />
          </Field>
          <Field label="Password">
            <input className={inputClass} name="password" type="password" required defaultValue="password123" />
          </Field>
          {sp.error ? <p className="text-sm text-[var(--danger)]">{sp.error}</p> : null}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-xs text-[var(--muted)]">
          Demo: admin@demo.local, hr@demo.local, finance@demo.local, staff@demo.local — password123
        </p>
      </Card>
    </div>
  );
}
