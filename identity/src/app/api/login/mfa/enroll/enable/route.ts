import { NextRequest, NextResponse } from "next/server";
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
import { verifyMfaPendingClaims } from "@/lib/mfaPendingToken";
import { issueSession, type SsoUser } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const mfaToken = typeof body?.mfaToken === "string" ? body.mfaToken : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const redirect = sanitizeRedirect(typeof body?.redirect === "string" ? body.redirect : null);
    if (!mfaToken || !code) {
      return NextResponse.json({ error: "MFA_CODE_REQUIRED" }, { status: 400 });
    }

    const claims = await verifyMfaPendingClaims(mfaToken);
    if (!claims || claims.purpose !== "ENROLL") {
      return NextResponse.json({ error: "MFA_SESSION_EXPIRED" }, { status: 401 });
    }

    const dataSource = await getDataSource();
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: claims.userId } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "MFA_SESSION_EXPIRED" }, { status: 401 });
    }
    if (user.mfaEnabled && user.mfaSecret) {
      return NextResponse.json({ error: "MFA_ALREADY_ENABLED" }, { status: 409 });
    }

    const policy = await getMfaRolePolicy(user.role);
    if (policy.mode === "DISABLED") {
      return NextResponse.json({ error: "MFA_ENROLLMENT_DISABLED" }, { status: 403 });
    }

    const secret = await getPendingMfaSecret(user.id);
    if (!secret) {
      return NextResponse.json({ error: "MFA_SETUP_EXPIRED" }, { status: 400 });
    }
    if (!(await verifyTotpCode(secret, code))) {
      return NextResponse.json({ error: "MFA_CODE_INVALID" }, { status: 400 });
    }

    const recoveryCodes = generateRecoveryCodes();
    user.mfaSecret = secret;
    user.mfaEnabled = true;
    user.mfaRecoveryCodes = await hashRecoveryCodes(recoveryCodes);
    user.tokenVersion += 1;
    await userRepo.save(user);
    await consumeMfaEnrollmentChallenge(user.id);

    const ssoUser: SsoUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId ?? null,
      federationId: user.federationId ?? null,
      leagueId: user.leagueId ?? null,
      playerId: user.playerId ?? null,
      tokenVersion: user.tokenVersion,
      mfaVerifiedAt: Date.now(),
    };
    const response = NextResponse.json({
      success: true,
      recoveryCodes,
      redirect: redirect ?? "/",
    });
    await issueSession(response, ssoUser);
    return response;
  } catch (error) {
    console.error("MFA pre-auth enrollment enable error:", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
