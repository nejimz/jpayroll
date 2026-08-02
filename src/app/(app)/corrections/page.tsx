import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requestMissedPunchAction, reviewMissedPunchAction } from "../actions/attendance";
import { Button, Card, Field, inputClass, PageHeader } from "@/components/ui";
import { hasRole } from "@/lib/rbac";

export default async function CorrectionsPage() {
  const user = await getSessionUser();
  const canReview = hasRole(user, ["HR", "ADMIN", "MANAGER"]);

  const mine = user?.employeeId
    ? await prisma.missedPunchRequest.findMany({
        where: { employeeId: user.employeeId },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  const pending = canReview
    ? await prisma.missedPunchRequest.findMany({
        where: { status: "PENDING", employee: { companyId: user!.companyId } },
        include: { employee: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div>
      <PageHeader title="Punch corrections" subtitle="Missed punch requests and HR/manager review." />

      {user?.employeeId ? (
        <Card className="mb-6">
          <h2 className="mb-3 font-medium">Request correction</h2>
          <form action={requestMissedPunchAction} className="grid gap-3 md:grid-cols-3">
            <Field label="Proposed time (local)">
              <input className={inputClass} name="proposedTime" type="datetime-local" required />
            </Field>
            <Field label="Type">
              <select className={inputClass} name="punchType" defaultValue="IN">
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </Field>
            <Field label="Reason">
              <input className={inputClass} name="reason" required />
            </Field>
            <div className="md:col-span-3">
              <Button type="submit">Submit</Button>
            </div>
          </form>
          <ul className="mt-4 space-y-1 text-sm text-[var(--muted)]">
            {mine.map((m) => (
              <li key={m.id}>
                {m.status} · {m.punchType} · {m.proposedTime.toISOString()} · {m.reason}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {canReview ? (
        <Card>
          <h2 className="mb-3 font-medium">Pending review</h2>
          <div className="space-y-4">
            {pending.length === 0 ? <p className="text-sm text-[var(--muted)]">No pending requests.</p> : null}
            {pending.map((p) => (
              <div key={p.id} className="border-t border-[var(--border)] pt-3 text-sm">
                <p>
                  <strong>{p.employee.fullName}</strong> · {p.punchType} · {p.proposedTime.toISOString()}
                </p>
                <p className="text-[var(--muted)]">{p.reason}</p>
                <form action={reviewMissedPunchAction} className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <Field label="Note">
                    <input className={inputClass} name="note" />
                  </Field>
                  <Button type="submit" name="decision" value="APPROVE">
                    Approve
                  </Button>
                  <Button type="submit" name="decision" value="REJECT" variant="secondary">
                    Reject
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
