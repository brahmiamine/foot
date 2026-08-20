import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, issueSession } from "@/lib/session";
import { sessionContextFromRequest } from "@/lib/sessionRegistry";
import { getDataSource } from "@/lib/db";
import { User } from "@/entities/User";
import {
  consumeMfaEnrollmentChallenge,
  generateRecoveryCodes,
  getPendingMfaSecret,
  hashRecoveryCodes,
  verifyTotpCode,
} from "@/lib/mfa";
import { getMfaRolePolicy } from "@/lib/mfaPolicy";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const policy = await getMfaRolePolicy(session.role);
  if (policy.mode === "DISABLED") {
    return NextResponse.json({ error: "MFA_ENROLLMENT_DISABLED" }, { status: 403 });
  }

  const body = await request.json();
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "MFA_CODE_REQUIRED" }, { status: 400 });
  }

  const secret = await getPendingMfaSecret(session.id);
  if (!secret) {
    return NextResponse.json({ error: "MFA_ENROLLMENT_EXPIRED" }, { status: 400 });
  }
  if (!(await verifyTotpCode(secret, code))) {
    return NextResponse.json({ error: "MFA_CODE_INVALID" }, { status: 400 });
  }
  await consumeMfaEnrollmentChallenge(session.id);

  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 404 });
  }

  const recoveryCodes = generateRecoveryCodes();
  user.mfaSecret = secret;
  user.mfaEnabled = true;
  user.mfaRecoveryCodes = await hashRecoveryCodes(recoveryCodes);
  user.tokenVersion += 1;
  await userRepo.save(user);

  const response = NextResponse.json({ success: true, recoveryCodes });
  await issueSession(
    response,
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId ?? null,
      federationId: user.federationId ?? null,
      leagueId: user.leagueId ?? null,
      playerId: user.playerId ?? null,
      tokenVersion: user.tokenVersion,
      sessionId: session.sessionId,
      mfaVerifiedAt: Date.now(),
    },
    sessionContextFromRequest(request),
  );
  return response;
}
