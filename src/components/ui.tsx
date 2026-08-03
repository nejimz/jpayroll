import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="motion-fade-in mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
  padded = true,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  variant?: "default" | "flush" | "interactive";
}) {
  const variants = {
    default: "rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]",
    flush: "rounded-[var(--radius)] bg-transparent",
    interactive:
      "rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] hover:border-accent/40 hover:shadow-[var(--shadow-md)]",
  };
  return (
    <div className={`${variants[variant]} ${padded && variant !== "flush" ? "p-4" : ""} ${className}`}>
      {children}
    </div>
  );
}

const buttonSizes = {
  sm: "min-h-9 px-2.5 py-1.5 text-xs",
  md: "min-h-10 px-3 py-2 text-sm",
  lg: "min-h-11 px-4 py-2.5 text-base",
} as const;

const buttonVariants = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-accent-hover disabled:hover:bg-accent",
  secondary:
    "border border-border bg-card text-foreground hover:border-accent/50 hover:text-accent disabled:hover:border-border disabled:hover:text-foreground",
  danger:
    "bg-danger text-white hover:bg-danger-hover active:bg-danger-hover disabled:hover:bg-danger",
  ghost:
    "bg-transparent text-muted hover:bg-accent-soft hover:text-accent disabled:hover:bg-transparent disabled:hover:text-muted",
} as const;

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}) {
  return (
    <button
      {...props}
      className={`motion-btn motion-press focus-ring inline-flex items-center justify-center gap-1.5 rounded-md font-medium disabled:cursor-not-allowed disabled:opacity-50 ${buttonSizes[size]} ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : null}
    </label>
  );
}

export const inputClass =
  "focus-ring w-full min-h-10 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] hover:border-muted focus:border-accent";

export const inputErrorClass =
  "focus-ring w-full min-h-10 rounded-md border border-danger bg-card px-3 py-2 text-sm outline-none";

export function StatusPill({
  tone = "neutral",
  children,
  dot,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
  children: ReactNode;
  dot?: boolean;
}) {
  const tones = {
    neutral: "bg-background text-muted ring-1 ring-border",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    accent: "bg-accent-soft text-accent",
  };
  const dots = {
    neutral: "bg-muted",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    accent: "bg-accent",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} aria-hidden /> : null}
      {children}
    </span>
  );
}

export function FormSection({
  title,
  description,
  children,
  columns = 4,
  divided = true,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: 2 | 3 | 4;
  divided?: boolean;
}) {
  const cols =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <section
      className={
        divided
          ? "border-t border-border pt-5 first:border-t-0 first:pt-0"
          : "pt-5 first:pt-0"
      }
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      <div className={`grid gap-3 ${cols}`}>{children}</div>
    </section>
  );
}

export function Banner({
  children,
  tone = "warning",
  className = "",
}: {
  children: ReactNode;
  tone?: "warning" | "info" | "danger" | "success";
  className?: string;
}) {
  const tones = {
    warning: "border-warning/30 bg-warning-soft text-warning",
    info: "border-accent/30 bg-accent-soft text-accent",
    danger: "border-danger/30 bg-danger-soft text-danger",
    success: "border-success/30 bg-success-soft text-success",
  };
  return (
    <div
      role="status"
      className={`border-b px-4 py-2.5 text-xs leading-relaxed md:px-8 ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <p className="font-[family-name:var(--font-display)] text-lg tracking-tight text-foreground">
        {title}
      </p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  href,
  hrefLabel,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-[var(--shadow-sm)]">
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight text-foreground">
        {value}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {href ? (
        <Link
          href={href}
          className="focus-ring mt-3 inline-block rounded text-sm font-medium text-accent hover:underline"
        >
          {hrefLabel ?? "View"}
        </Link>
      ) : null}
    </div>
  );
}

export function DataTable({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-background/80">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
  );
}
