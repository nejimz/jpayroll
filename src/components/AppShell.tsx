"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { SessionUser } from "@/lib/rbac";
import {
  DASHBOARD_NAV,
  getNavSections,
  getPageTitle,
  isNavActive,
  type NavSection,
} from "@/components/nav-config";
import { signOutAction } from "@/app/(app)/actions/auth";
import { Banner, Button } from "@/components/ui";

function navLinkClass(active: boolean) {
  return `motion-nav focus-ring flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
    active
      ? "bg-accent-soft font-medium text-accent"
      : "text-foreground/80 hover:bg-accent-soft hover:text-accent"
  }`;
}

function NavSections({
  sections,
  pathname,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const DashIcon = DASHBOARD_NAV.icon;
  return (
    <nav className="flex flex-col gap-6 px-3 pb-6" aria-label="Main">
      <div>
        <Link
          href={DASHBOARD_NAV.href}
          onClick={onNavigate}
          className={navLinkClass(isNavActive(pathname, DASHBOARD_NAV.href))}
        >
          <DashIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          {DASHBOARD_NAV.label}
        </Link>
      </div>
      {sections.map((section) => (
        <div key={section.id}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {section.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={navLinkClass(active)}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
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
    <div className="border-b border-border px-5 py-5">
      <Link href="/dashboard" className="block focus-ring rounded-md">
        <span className="font-[family-name:var(--font-display)] text-xl tracking-tight text-foreground">
          Payroll PH
        </span>
        <p className="mt-1 text-xs text-muted">Timekeeping & payroll</p>
      </Link>
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
  const pageTitle = getPageTitle(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const first = drawerRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    first?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card md:flex">
        <BrandBlock />
        <div className="flex-1 overflow-y-auto pt-4">
          <NavSections sections={sections} pathname={pathname} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px] transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            ref={drawerRef}
            className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-card shadow-[var(--shadow-md)]"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span
                id={titleId}
                className="font-[family-name:var(--font-display)] text-lg tracking-tight"
              >
                Payroll PH
              </span>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  queueMicrotask(() => menuButtonRef.current?.focus());
                }}
                className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-muted hover:text-accent"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden />
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
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={menuButtonRef}
                type="button"
                className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-muted hover:border-accent hover:text-accent md:hidden"
                aria-label="Open menu"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
              <div className="min-w-0 md:hidden">
                <p className="truncate text-xs text-muted">Payroll PH</p>
                <p className="truncate font-[family-name:var(--font-display)] text-base tracking-tight">
                  {pageTitle}
                </p>
              </div>
              <div className="hidden md:block">
                <p className="font-[family-name:var(--font-display)] text-lg tracking-tight text-foreground">
                  {pageTitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight">{user.name}</p>
                <p className="text-xs text-muted">{user.role}</p>
              </div>
              <form action={signOutAction}>
                <Button type="submit" variant="secondary" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
          <Banner tone="warning" className="border-t border-warning/20">
            Contribution and tax tables are illustrative. Verify against current SSS, PhilHealth,
            Pag-IBIG, and BIR circulars before production use.
          </Banner>
        </header>

        <main className="motion-fade-in w-full max-w-6xl px-4 py-6 md:px-8">{children}</main>

        <footer className="w-full max-w-6xl px-4 pb-8 text-xs text-muted md:px-8">
          Philippines payroll · Asia/Manila day boundaries · amounts in PHP
        </footer>
      </div>
    </div>
  );
}
