import { NextResponse } from "next/server";
import { kioskPunchByBadge, parseClientIpFromHeaders } from "@/domain/kiosk";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_badge", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const badgeCode =
    typeof body === "object" && body && "badgeCode" in body
      ? String((body as { badgeCode: unknown }).badgeCode ?? "")
      : "";

  const ip = parseClientIpFromHeaders(request.headers);
  const result = await kioskPunchByBadge({ badgeCode, ipAddress: ip });

  if (!result.ok) {
    const status =
      result.code === "not_allowed"
        ? 403
        : result.code === "unknown_badge" || result.code === "invalid_badge"
          ? 404
          : result.code === "inactive"
            ? 403
            : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
