import { getSessionUser } from "@/lib/session";
import { getLastPunch } from "@/domain/attendance";
import { formatManilaDateTime } from "@/lib/manila";
import { punchAction } from "../actions/attendance";
import { Button, StatusPill } from "@/components/ui";
import { ManilaLiveClock } from "@/components/ManilaLiveClock";
import { redirect } from "next/navigation";

export default async function ClockPage() {
  const user = await getSessionUser();
  if (!user?.employeeId) redirect("/dashboard");
  const last = await getLastPunch(user.employeeId);
  const next: "IN" | "OUT" = !last || last.punchType === "OUT" ? "IN" : "OUT";

  return (
    <div className="safe-pad relative mx-auto max-w-lg overflow-hidden rounded-[var(--radius)] px-2 py-8 sm:px-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, var(--accent-soft), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">Time clock</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight">
          {user.name}
        </h1>
      </div>

      <ManilaLiveClock size="xl" />

      <div className="mt-8 flex flex-col items-center gap-2">
        <StatusPill tone={next === "IN" ? "accent" : "warning"} dot>
          Next action: Time {next === "IN" ? "In" : "Out"}
        </StatusPill>
        <p className="max-w-sm text-center text-sm text-muted">
          {last
            ? `Last punch: ${last.punchType} · ${formatManilaDateTime(last.punchedAt)} (${last.source})`
            : "No punches yet today."}
        </p>
      </div>

      <form
        className="mt-10"
        action={async () => {
          "use server";
          await punchAction(next);
        }}
      >
        <Button type="submit" size="lg" className="min-h-14 w-full text-lg">
          {next === "IN" ? "Time In" : "Time Out"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        Server time is authoritative for all punches.
      </p>
    </div>
  );
}
