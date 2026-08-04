"use client";

import { useMemo, useState } from "react";
import { IdCard, Download } from "lucide-react";
import { Button, StatusPill } from "@/components/ui";

export type IdCardEmployeeRow = {
  id: string;
  employeeNo: string;
  name: string;
  department: string | null;
  badgeCode: string | null;
};

export function IdCardSelector({ employees }: { employees: IdCardEmployeeRow[] }) {
  const printableIds = useMemo(
    () => employees.filter((e) => Boolean(e.badgeCode?.trim())).map((e) => e.id),
    [employees]
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(printableIds));

  const selectedPrintable = useMemo(
    () => printableIds.filter((id) => selected.has(id)),
    [printableIds, selected]
  );

  function toggle(id: string, canPrint: boolean) {
    if (!canPrint) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllPrintable() {
    setSelected(new Set(printableIds));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const downloadHref =
    selectedPrintable.length === 0
      ? null
      : selectedPrintable.length === printableIds.length && printableIds.length > 0
        ? "/api/id-cards/pdf"
        : `/api/id-cards/pdf?ids=${selectedPrintable.join(",")}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-9 px-3 text-sm"
          onClick={selectAllPrintable}
          disabled={printableIds.length === 0}
        >
          Select all with badge
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-9 px-3 text-sm"
          onClick={clearSelection}
          disabled={selected.size === 0}
        >
          Clear
        </Button>
        {downloadHref ? (
          <a
            href={downloadHref}
            className="motion-btn motion-press focus-ring inline-flex min-h-10 items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download PDF ({selectedPrintable.length})
          </a>
        ) : (
          <Button type="button" disabled className="min-h-10 gap-2 px-4 text-sm">
            <Download className="h-4 w-4" aria-hidden />
            Download PDF
          </Button>
        )}
      </div>

      <p className="text-sm text-muted">
        Barcode and QR encode each employee&apos;s <span className="font-mono">badgeCode</span> for
        kiosk Time In / Out. Cards are CR80 size on A4 (2×4 per page).
      </p>

      <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-sm)]">
        {employees.map((e) => {
          const canPrint = Boolean(e.badgeCode?.trim());
          const checked = selected.has(e.id);
          return (
            <li key={e.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 px-4 py-3 sm:items-center ${
                  canPrint ? "hover:bg-background/80" : "cursor-not-allowed opacity-70"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[var(--accent)] sm:mt-0"
                  checked={checked && canPrint}
                  disabled={!canPrint}
                  onChange={() => toggle(e.id, canPrint)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{e.name}</p>
                    {canPrint ? (
                      <StatusPill tone="accent" dot>
                        Ready
                      </StatusPill>
                    ) : (
                      <StatusPill tone="neutral">No badge code</StatusPill>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {e.employeeNo}
                    <span aria-hidden> · </span>
                    {e.department ?? "No department"}
                    {e.badgeCode ? (
                      <>
                        <span aria-hidden> · </span>
                        <span className="font-mono">{e.badgeCode}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                {canPrint ? (
                  <a
                    href={`/api/id-cards/pdf?ids=${e.id}`}
                    className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium hover:border-accent hover:text-accent"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <IdCard className="h-3.5 w-3.5" aria-hidden />
                    Print one
                  </a>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
