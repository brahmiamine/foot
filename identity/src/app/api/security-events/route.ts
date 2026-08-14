import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { listSecurityEventsForAdmin, type SecurityEventType } from "@/lib/securityLog";

export const runtime = "nodejs";

const VALID_TYPES = new Set<SecurityEventType>([
  "LOGIN_FAILED",
  "LOGIN_RATE_LIMITED",
  "MFA_FAILED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "PASSWORD_RESET_FAILED",
  "PASSWORD_CHANGED",
  "PASSWORD_CHANGE_FAILED",
]);

/**
 * Alimente /security-events (viewer admin SUPERADMIN, voir avancement.md
 * "sso" — pas de viewer admin pour security_events).
 */
export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");
  const type = typeParam && VALID_TYPES.has(typeParam as SecurityEventType) ? (typeParam as SecurityEventType) : undefined;
  const email = searchParams.get("email") ?? undefined;
  const limit = Number(searchParams.get("limit")) || 25;
  const offset = Number(searchParams.get("offset")) || 0;

  const result = await listSecurityEventsForAdmin({ type, email, limit, offset });
  return NextResponse.json(result);
}
