"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/rbac";
import { getNavSections, isNavActive, type NavSection } from "@/components/nav-config";
import { signOutAction } from "@/app/(app)/actions/auth";

function NavSections({
  sections,
  pathname,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-6 px-3 pb-6">
      <div>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={`block rounded-md px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
            isNavActive(pathname, "/dashboard")
              ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
              : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          }`}
        >
          Dashboard
        </Link>
      </div>
      {sections.map((section) => (
        <div key={section.id}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {section.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`block rounded-md px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                      active
                        ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                        : "text-[var(--foreground)]/80 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function BrandBlock() {
  return (
    <div className="border-b border-[var(--border)] px-5 py-5">
      <Link
        href="/dashboard"
        className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--foreground)]"
      >
        Payroll PH
      </Link>
      <p className="mt-1 text-xs text-[var(--muted)]">Timekeeping & payroll</p>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const sections = getNavSections(user);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--card)] md:flex">
        <BrandBlock />
        <div className="flex-1 overflow-y-auto pt-4">
          <NavSections sections={sections} pathname={pathname} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-[var(--foreground)]/30"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-[var(--card)] shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                Payroll PH
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md border border-[var(--border)] px-2.5 py-1 text-sm text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pt-4">
              <NavSections
                sections={sections}
                pathname={pathname}
                onNavigate={() => setDrawerOpen(false)}
              />
            </div>
          </aside>
        </div>
      ) : null}

      {/* Main column */}
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-2.5 py-1.5 text-sm md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                aria-label="Open menu"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              >
                Menu
              </button>
              <div className="md:hidden">
                <p className="font-[family-name:var(--font-display)] text-base tracking-tight">
                  Payroll PH
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium leading-tight">{user.name}</p>
                <p className="text-xs text-[var(--muted)]">{user.role}</p>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="w-full max-w-6xl px-4 py-6 md:px-8">{children}</main>

        <footer className="w-full max-w-6xl px-4 pb-8 text-xs text-[var(--muted)] md:px-8">
          Contribution and tax tables are illustrative. Verify against current SSS, PhilHealth,
          Pag-IBIG, and BIR circulars before production use.
        </footer>
      </div>
    </div>
  );
}
