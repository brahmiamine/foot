import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getMfaRolePolicy, listMfaRolePolicies, updateMfaRolePolicy } from "@/lib/mfaPolicy";
import { hasRecentMfa, getStepUpMaxAgeSeconds } from "@/lib/stepUp";
import { getClientIP } from "@/lib/getClientIP";
import type { MfaPolicyMode } from "@/entities/MfaRolePolicy";
import type { User } from "@/entities/User";
import { isTrustedOrigin } from "@/lib/csrf";

const ROLES: User["role"][] = [
  "ADMIN",
  "OBSERVATEUR",
  "SUPERADMIN",
  "MEMBER",
  "PLATFORM_SUPERADMIN",
  "FEDERATION_ADMIN",
  "LEAGUE_ADMIN",
  "REFEREE",
  "MATCH_OFFICIAL",
  "REFEREE_OBSERVER",
  "PLAYER",
];
const MODES: MfaPolicyMode[] = ["REQUIRED", "OPTIONAL", "DISABLED"];

function canManage(role: User["role"]): boolean {
  return role === "SUPERADMIN" || role === "PLATFORM_SUPERADMIN";
}

function readOptionalDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new Error("INVALID_POLICY_DATE");
  return parsed;
}

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || !canManage(session.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const role = request.nextUrl.searchParams.get("role");
  const at = readOptionalDate(request.nextUrl.searchParams.get("at")) ?? new Date();
  if (role && ROLES.includes(role as User["role"])) {
    return NextResponse.json({ policy: await getMfaRolePolicy(role as User["role"], at) });
  }
  return NextResponse.json({ policies: await listMfaRolePolicies(at) });
}

export async function PATCH(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session || !canManage(session.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const maxAgeSeconds = getStepUpMaxAgeSeconds();
  if (!hasRecentMfa(session, maxAgeSeconds)) {
    return NextResponse.json(
      { error: "STEP_UP_REQUIRED", maxAgeSeconds },
      { status: 428 },
    );
  }

  try {
    const body = await request.json();
    const role = typeof body?.role === "string" && ROLES.includes(body.role) ? body.role : null;
    const mode = typeof body?.mode === "string" && MODES.includes(body.mode) ? body.mode : null;
    const gracePeriodDays = Number(body?.gracePeriodDays);
    const reason = typeof body?.reason === "string" ? body.reason : "";
    if (!role || !mode || !Number.isInteger(gracePeriodDays)) {
      return NextResponse.json({ error: "INVALID_POLICY" }, { status: 400 });
    }

    const policy = await updateMfaRolePolicy({
      role,
      mode,
      gracePeriodDays,
      effectiveFrom: readOptionalDate(body?.effectiveFrom),
      effectiveUntil: readOptionalDate(body?.effectiveUntil),
      updatedBy: session.id,
      actorRole: session.role,
      reason,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ policy });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "INVALID_POLICY" },
      { status: 400 },
    );
  }
}