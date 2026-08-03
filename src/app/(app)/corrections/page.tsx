import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatEmployeeName } from "@/lib/employee-name";
import { formatManilaDateTime } from "@/lib/manila";
import { requestMissedPunchAction, reviewMissedPunchAction } from "../actions/attendance";
import {
  Button,
  Card,
  EmptyState,
  Field,
  inputClass,
  PageHeader,
  SectionLabel,
  StatusPill,
} from "@/components/ui";
import { hasRole } from "@/lib/rbac";

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "accent" {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "PENDING") return "warning";
  return "neutral";
}

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
    <div className="space-y-8">
      <PageHeader
        title="Punch corrections"
        subtitle="Missed punch requests and HR/manager review."
      />

      {user?.employeeId ? (
        <section>
          <SectionLabel>Request correction</SectionLabel>
          <Card>
            <form action={requestMissedPunchAction} className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
              <div className="sm:col-span-2 md:col-span-3">
                <Button type="submit" className="min-h-11">
                  Submit request
                </Button>
              </div>
            </form>
          </Card>

          <div className="mt-4">
            <SectionLabel>My requests</SectionLabel>
            {mine.length === 0 ? (
              <Card padded={false}>
                <EmptyState title="No requests yet" description="Submit a missed punch above." />
              </Card>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
                {mine.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {m.punchType} · {formatManilaDateTime(m.proposedTime)}
                      </p>
                      <p className="text-muted">{m.reason}</p>
                    </div>
                    <StatusPill tone={statusTone(m.status)}>{m.status}</StatusPill>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {canReview ? (
        <section>
          <SectionLabel>Pending review</SectionLabel>
          {pending.length === 0 ? (
            <Card padded={false}>
              <EmptyState title="No pending requests" description="You're all caught up." />
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <Card key={p.id} variant="interactive">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{formatEmployeeName(p.employee)}</p>
                      <p className="mt-0.5 text-sm">
                        {p.punchType} · {formatManilaDateTime(p.proposedTime)}
                      </p>
                      <p className="mt-1 text-sm text-muted">{p.reason}</p>
                    </div>
                    <StatusPill tone="warning" dot>
                      Pending
                    </StatusPill>
                  </div>
                  <form
                    action={reviewMissedPunchAction}
                    className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-end"
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <div className="min-w-[12rem] flex-1">
                      <Field label="Note">
                        <input className={inputClass} name="note" />
                      </Field>
                    </div>
                    <Button type="submit" name="decision" value="APPROVE" className="min-h-11">
                      Approve
                    </Button>
                    <Button
                      type="submit"
                      name="decision"
                      value="REJECT"
                      variant="secondary"
                      className="min-h-11"
                    >
                      Reject
                    </Button>
                  </form>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
