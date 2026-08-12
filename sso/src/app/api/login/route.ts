import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/authenticate";
import { issueSession } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";
import { getClientIP } from "@/lib/getClientIP";
import { clearFailedLoginAttempts, isLoginRateLimited, recordFailedLoginAttempt } from "@/lib/loginRateLimit";
import { isMfaEnabled } from "@/lib/mfa";
import { signMfaPendingToken } from "@/lib/mfaPendingToken";
import { logSecurityEvent } from "@/lib/securityLog";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/**
 * Le formulaire de login n'est rendu que par `sso` lui-même (les 5 autres
 * apps redirigent le navigateur vers la page hébergée, jamais un fetch
 * cross-origin direct) — vérifier l'origine ferme le "login CSRF" (un site
 * tiers forçant la connexion d'une victime à un compte choisi par
 * l'attaquant) sans casser aucun flux légitime.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const clientIP = getClientIP(request);

    if (isLoginRateLimited(clientIP)) {
      logSecurityEvent({ type: "LOGIN_RATE_LIMITED", ip: clientIP });
      return NextResponse.json(
        { error: "RATE_LIMITED" },
        { status: 429 }
      );
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

    // Mot de passe correct, mais MFA activée sur ce compte (voir
    // /account/mfa) : pas de session tant que le code TOTP n'est pas
    // vérifié par /api/login/mfa. Le jeton renvoyé ici n'est jamais posé en
    // cookie (voir src/lib/mfaPendingToken.ts).
    if (await isMfaEnabled(user.id)) {
      const mfaToken = await signMfaPendingToken(user.id);
      return NextResponse.json({ mfaRequired: true, mfaToken });
    }

    const response = NextResponse.json({ success: true, redirect: redirect ?? "/" });
    await issueSession(response, user);
    return response;
  } catch (error) {
    console.error("SSO login error:", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
