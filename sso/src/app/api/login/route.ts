import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/authenticate";
import { issueSession } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";
import { getClientIP } from "@/lib/getClientIP";
import { clearFailedLoginAttempts, isLoginRateLimited, recordFailedLoginAttempt } from "@/lib/loginRateLimit";
import { isMfaEnabled } from "@/lib/mfa";
import { signMfaPendingToken } from "@/lib/mfaPendingToken";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);

    if (isLoginRateLimited(clientIP)) {
      return NextResponse.json(
        { error: "Trop de tentatives échouées. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const teamId = typeof body.teamId === "string" && body.teamId ? body.teamId : null;
    const redirect = sanitizeRedirect(typeof body.redirect === "string" ? body.redirect : null);

    if (!email || !password) {
      return NextResponse.json({ error: "Identifiants requis" }, { status: 400 });
    }

    const user = await authenticate({ email, password, teamId });
    if (!user) {
      recordFailedLoginAttempt(clientIP);
      return NextResponse.json({ error: "Email, mot de passe ou club incorrect" }, { status: 401 });
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
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
