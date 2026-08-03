import { NextResponse } from "next/server";
import { parseClientIpFromHeaders, resolveKioskCompanyByIp } from "@/domain/kiosk";

/** Public probe so the kiosk UI can show idle vs “not available on this network”. */
export async function GET(request: Request) {
  const ip = parseClientIpFromHeaders(request.headers);
  const company = await resolveKioskCompanyByIp(ip);
  return NextResponse.json({
    available: Boolean(company),
    companyName: company?.name ?? null,
    clientIp: ip,
  });
}
