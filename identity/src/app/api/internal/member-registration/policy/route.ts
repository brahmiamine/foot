import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import {
  getMemberRegistrationPolicy,
  updateMemberRegistrationPolicy,
  type MemberRegistrationMode,
} from "@/lib/memberRegistrationPolicy";

export const runtime = "nodejs";

const MODES = new Set<MemberRegistrationMode>([
  "OPEN",
  "EMAIL_VERIFICATION",
  "CLUB_APPROVAL",
  "INVITE_ONLY",
  "CLOSED",
]);

function parseDate(value: unknown): Date | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;
  const teamId = request.nextUrl.searchParams.get("teamId")?.trim();
  if (!teamId) return NextResponse.json({ error: "teamId requis" }, { status: 400 });
  const policy = await getMemberRegistrationPolicy(teamId);
  return NextResponse.json({
    ...policy,
    effectiveFrom: policy.effectiveFrom?.toISOString() ?? null,
    effectiveUntil: policy.effectiveUntil?.toISOString() ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const teamId = typeof body?.teamId === "string" ? body.teamId.trim() : "";
    const mode = typeof body?.mode === "string" ? (body.mode as MemberRegistrationMode) : null;
    const actorUserId = typeof body?.actorUserId === "string" ? body.actorUserId.trim() : "";
    const actorRole = typeof body?.actorRole === "string" ? body.actorRole.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason : "";
    const effectiveFrom = parseDate(body?.effectiveFrom);
    const effectiveUntil = parseDate(body?.effectiveUntil);
    if (!teamId || !mode || !MODES.has(mode) || !actorUserId || !actorRole) {
      return NextResponse.json({ error: "teamId, mode, actorUserId et actorRole valides requis" }, { status: 400 });
    }
    if (effectiveFrom === undefined || effectiveUntil === undefined) {
      return NextResponse.json({ error: "Dates d'effet invalides" }, { status: 400 });
    }
    const policy = await updateMemberRegistrationPolicy({
      teamId,
      mode,
      updatedBy: actorUserId,
      actorRole,
      reason,
      effectiveFrom,
      effectiveUntil,
      ipAddress: typeof body?.ipAddress === "string" ? body.ipAddress : null,
      userAgent: typeof body?.userAgent === "string" ? body.userAgent : null,
    });
    return NextResponse.json({
      ...policy,
      effectiveFrom: policy.effectiveFrom?.toISOString() ?? null,
      effectiveUntil: policy.effectiveUntil?.toISOString() ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de policy";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
