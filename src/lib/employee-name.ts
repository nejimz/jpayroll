import type { Employee } from "@prisma/client";

export type EmployeeNameParts = Pick<
  Employee,
  "firstName" | "middleName" | "lastName" | "suffix"
>;

/** Display name: First Middle Last Suffix */
export function formatEmployeeName(
  e: Pick<EmployeeNameParts, "firstName" | "middleName" | "lastName" | "suffix">
): string {
  const parts = [e.firstName, e.middleName, e.lastName].filter(
    (p): p is string => Boolean(p && p.trim())
  );
  const base = parts.join(" ");
  const suffix = e.suffix?.trim();
  return suffix ? `${base} ${suffix}` : base;
}
