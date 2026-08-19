import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, issueSession } from "@/lib/session";
import { sessionContextFromRequest } from "@/lib/sessionRegistry";
import { getDataSource } from "@/lib/db";
import { User } from "@/entities/User";
import { consumeRecoveryCode, verifyTotpCode } from "@/lib/mfa";
import { isTrustedOrigin } from "@/lib/csrf";
import { sanitizeRedirect } from "@/lib/redirect";
import { getClientIP } from "@/lib/getClientIP";
import {
  clearFailedLoginAttempts,
  isLoginRateLimited,
  recordFailedLoginAttempt,
} from "@/lib/loginRateLimit";
import { logSecurityEvent } from "@/lib/securityLog";

export const runtime = "nodejs";

/**
 * Revalidates MFA for an already authenticated session and reissues the SSO
 * cookie with a fresh signed mfaVerifiedAt claim. It never changes role or
 * scope and accepts only users who already have MFA enabled.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const clientIP = getClientIP(request);
  if (isLoginRateLimited(clientIP)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const redirect = sanitizeRedirect(typeof body?.redirect === "string" ? body.redirect : null);
    if (!code) {
      return NextResponse.json({ error: "MFA_CODE_REQUIRED" }, { status: 400 });
    }

    const dataSource = await getDataSource();
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: session.id } });
    if (!user || !user.isActive || !user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json({ error: "MFA_NOT_ENABLED" }, { status: 409 });
    }

    let valid = await verifyTotpCode(user.mfaSecret, code);
    if (!valid) {
      const recovery = await consumeRecoveryCode(user.mfaRecoveryCodes, code);
      if (recovery.valid) {
        valid = true;
        user.mfaRecoveryCodes = recovery.remaining;
        await userRepo.save(user);
      }
    }

    if (!valid) {
      recordFailedLoginAttempt(clientIP);
      logSecurityEvent({ type: "MFA_FAILED", userId: user.id, ip: clientIP });
      return NextResponse.json({ error: "MFA_CODE_INVALID" }, { status: 401 });
    }

    clearFailedLoginAttempts(clientIP);
    const response = NextResponse.json({ success: true, redirect: redirect ?? "/" });
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
  } catch (error) {
    console.error("MFA step-up error:", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
