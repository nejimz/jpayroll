import { getSessionUser } from "@/lib/session";
import { getLastPunch } from "@/domain/attendance";
import { formatManilaDateTime } from "@/lib/manila";
import { punchAction } from "../actions/attendance";
import { Button, Card, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function ClockPage() {
  const user = await getSessionUser();
  if (!user?.employeeId) redirect("/dashboard");
  const last = await getLastPunch(user.employeeId);
  const next: "IN" | "OUT" = !last || last.punchType === "OUT" ? "IN" : "OUT";

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Time In / Out" subtitle="Server time is used for all punches (Asia/Manila day)." />
      <Card className="text-center">
        <p className="text-sm text-[var(--muted)]">Now</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">
          {formatManilaDateTime(new Date())}
        </p>
        <p className="mt-6 text-sm text-[var(--muted)]">Last punch</p>
        <p className="mt-1 text-lg">
          {last
            ? `${last.punchType} · ${formatManilaDateTime(last.punchedAt)} (${last.source})`
            : "None yet"}
        </p>
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await punchAction(next);
          }}
        >
          <Button type="submit" className="w-full py-4 text-base">
            {next === "IN" ? "Time In" : "Time Out"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
