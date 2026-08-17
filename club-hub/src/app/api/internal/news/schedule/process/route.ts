import { NextRequest, NextResponse } from "next/server";
import { ClubApprovalService } from "@/services/ClubApprovalService";
import { timingSafeEqual } from "node:crypto";

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SERVICE_API_KEY || "";
  const provided = request.headers.get("x-service-api-key") || "";
  if (!expected || !provided) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Poll-once idempotent pour un ordonnanceur externe (cron/Kubernetes/etc.).
 * Les News approuvées en SCHEDULED restent invisibles jusqu'à scheduledAt.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const result = await new ClubApprovalService().processScheduledNewsDue();
  return NextResponse.json(result);
}
