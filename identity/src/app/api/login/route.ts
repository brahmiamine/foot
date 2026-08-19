import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/authenticate";
import { issueSession } from "@/lib/session";
import { sessionContextFromRequest } from "@/lib/sessionRegistry";
import { sanitizeRedirect } from "@/lib/redirect";
import { getClientIP } from "@/lib/getClientIP";
import { clearFailedLoginAttempts, isLoginRateLimited, recordFailedLoginAttempt } from "@/lib/loginRateLimit";
import { isMfaEnabled } from "@/lib/mfa";
import { getMfaRolePolicy } from "@/lib/mfaPolicy";
import { signMfaPendingToken } from "@/lib/mfaPendingToken";
import { logSecurityEvent } from "@/lib/securityLog";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/**
 * Le formulaire de login n'est rendu que par Identity lui-même. Après mot
 * de passe valide, la policy MFA du rôle est appliquée côté serveur avant
 * toute émission de session.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const clientIP = getClientIP(request);

    if (isLoginRateLimited(clientIP)) {
      logSecurityEvent({ type: "LOGIN_RATE_LIMITED", ip: clientIP });
      return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const teamId = typeof body.teamId === "string" && body.teamId ? body.teamId : null;
    const redirect = sanitizeRedirect(typeof body.redirect === "string" ? body.redirect : null);

    if (!email || !password) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 400 });
    }

    const user = await authenticate({ email, password, teamId });
    if (!user) {
      recordFailedLoginAttempt(clientIP);
      logSecurityEvent({ type: "LOGIN_FAILED", email, ip: clientIP });
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    clearFailedLoginAttempts(clientIP);
    const [mfaEnabled, mfaPolicy] = await Promise.all([
      isMfaEnabled(user.id),
      getMfaRolePolicy(user.role),
    ]);

    // Une MFA déjà activée n'est jamais silencieusement contournée, même si
    // la policy du rôle est ensuite rendue OPTIONAL/DISABLED.
    if (mfaEnabled) {
      const mfaToken = await signMfaPendingToken(user.id, "VERIFY");
      return NextResponse.json({ mfaRequired: true, mfaToken });
    }

    // Après la période de grâce, un rôle REQUIRED ne reçoit aucune session
    // tant que l'enrôlement TOTP n'est pas terminé.
    if (mfaPolicy.requirementEnforced) {
      const mfaToken = await signMfaPendingToken(user.id, "ENROLL");
      return NextResponse.json({
        mfaEnrollmentRequired: true,
        mfaToken,
        policy: { mode: mfaPolicy.mode, gracePeriodDays: mfaPolicy.gracePeriodDays },
      });
    }

    // Une période de grâce explicitement configurée autorise temporairement
    // la session mais demande au frontend d'orienter l'utilisateur vers
    // l'enrôlement avant la date de fin.
    const response = NextResponse.json({
      success: true,
      redirect: redirect ?? "/",
      mfaEnrollmentGrace: mfaPolicy.mode === "REQUIRED",
      mfaGraceEndsAt: mfaPolicy.graceEndsAt?.toISOString() ?? null,
    });
    await issueSession(response, user, sessionContextFromRequest(request));
    return response;
  } catch (error) {
    console.error("SSO login error:", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
