import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AppNav } from "@/components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <AppNav user={user} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-[var(--muted)]">
        Contribution and tax tables are illustrative. Verify against current SSS, PhilHealth, Pag-IBIG, and BIR circulars before production use.
      </footer>
    </div>
  );
}
