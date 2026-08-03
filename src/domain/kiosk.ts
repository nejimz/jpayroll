import { prisma } from "@/lib/prisma";
import { formatEmployeeName } from "@/lib/employee-name";
import { formatManilaDateTime } from "@/lib/manila";
import { writeAudit } from "@/lib/audit";
import { clockPunch, getLastPunch } from "@/domain/attendance";
import type { Company, PunchType } from "@prisma/client";

export type KioskPunchErrorCode =
  | "not_allowed"
  | "unknown_badge"
  | "inactive"
  | "invalid_badge"
  | "punch_failed";

export type KioskPunchResult =
  | {
      ok: true;
      employeeName: string;
      punchType: PunchType;
      punchedAt: string;
    }
  | {
      ok: false;
      code: KioskPunchErrorCode;
      message: string;
    };

/** Normalize proxy / IPv4-mapped IPv6 forms for allowlist comparison. */
export function normalizeClientIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let ip = raw.trim();
  if (!ip) return null;
  // First hop only when multiple are listed
  if (ip.includes(",")) ip = ip.split(",")[0]!.trim();
  // Strip IPv4-mapped IPv6 prefix
  if (ip.toLowerCase().startsWith("::ffff:")) {
    ip = ip.slice(7);
  }
  // Strip surrounding brackets for IPv6
  if (ip.startsWith("[") && ip.endsWith("]")) {
    ip = ip.slice(1, -1);
  }
  return ip || null;
}

export function parseClientIpFromHeaders(h: Headers): string | null {
  const forwarded = h.get("x-forwarded-for");
  const real = h.get("x-real-ip");
  const fromHeaders = normalizeClientIp(forwarded) ?? normalizeClientIp(real);
  if (fromHeaders) return fromHeaders;
  // Local `next dev` often has no proxy headers; treat as loopback for allowlist testing.
  if (process.env.NODE_ENV === "development") return "127.0.0.1";
  return null;
}

export async function resolveKioskCompanyByIp(ip: string | null): Promise<Company | null> {
  if (!ip) return null;
  const companies = await prisma.company.findMany({
    where: { kioskEnabled: true },
  });
  return companies.find((c) => c.kioskAllowedIps.some((allowed) => normalizeClientIp(allowed) === ip)) ?? null;
}

export async function kioskPunchByBadge(params: {
  badgeCode: string;
  ipAddress: string | null;
}): Promise<KioskPunchResult> {
  const badgeCode = params.badgeCode.trim();
  if (!badgeCode) {
    return { ok: false, code: "invalid_badge", message: "Scan a badge to clock in or out." };
  }

  const company = await resolveKioskCompanyByIp(params.ipAddress);
  if (!company) {
    return {
      ok: false,
      code: "not_allowed",
      message: "Kiosk not available on this network.",
    };
  }

  const employee = await prisma.employee.findFirst({
    where: { companyId: company.id, badgeCode },
  });

  if (!employee) {
    return { ok: false, code: "unknown_badge", message: "Unknown badge." };
  }
  if (employee.status !== "ACTIVE") {
    return { ok: false, code: "inactive", message: "Employee is not active." };
  }

  const last = await getLastPunch(employee.id);
  const punchType: PunchType = !last || last.punchType === "OUT" ? "IN" : "OUT";

  try {
    const log = await clockPunch({
      employeeId: employee.id,
      companyId: company.id,
      punchType,
      ipAddress: params.ipAddress,
      source: "KIOSK",
    });

    await writeAudit({
      companyId: company.id,
      actorId: null,
      action: `KIOSK_PUNCH_${punchType}`,
      entityType: "AttendanceLog",
      entityId: log.id,
      after: { employeeId: employee.id, badgeCode, punchType },
    });

    return {
      ok: true,
      employeeName: formatEmployeeName(employee),
      punchType,
      punchedAt: formatManilaDateTime(log.punchedAt),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Punch failed.";
    return { ok: false, code: "punch_failed", message };
  }
}
