import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { SponsorshipExpirationService } from "@/services/SponsorshipExpirationService";

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SERVICE_API_KEY || "";
  const provided = request.headers.get("x-service-api-key") || "";
  if (!expected || !provided) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Poll-once idempotent pour cron/Kubernetes/etc. */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const result = await new SponsorshipExpirationService().processDue();
  return NextResponse.json(result);
}
