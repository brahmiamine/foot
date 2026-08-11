import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/db";
import { User } from "@/entities/User";
import { issueSession, type SsoUser } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";
import { getClientIP } from "@/lib/getClientIP";
import { clearFailedLoginAttempts, isLoginRateLimited, recordFailedLoginAttempt } from "@/lib/loginRateLimit";
import { consumeRecoveryCode, verifyTotpCode } from "@/lib/mfa";
import { verifyMfaPendingToken } from "@/lib/mfaPendingToken";
import { logSecurityEvent } from "@/lib/securityLog";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);

    if (isLoginRateLimited(clientIP)) {
      logSecurityEvent({ type: "LOGIN_RATE_LIMITED", ip: clientIP });
      return NextResponse.json(
        { error: "Trop de tentatives échouées. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const mfaToken = typeof body.mfaToken === "string" ? body.mfaToken : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const redirect = sanitizeRedirect(typeof body.redirect === "string" ? body.redirect : null);

    if (!mfaToken || !code) {
      return NextResponse.json({ error: "Code requis" }, { status: 400 });
    }

    const userId = await verifyMfaPendingToken(mfaToken);
    if (!userId) {
      return NextResponse.json(
        { error: "Session de connexion expirée, reconnectez-vous." },
        { status: 401 }
      );
    }

    const dataSource = await getDataSource();
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user || !user.isActive || !user.mfaEnabled || !user.mfaSecret) {
      recordFailedLoginAttempt(clientIP);
      logSecurityEvent({ type: "MFA_FAILED", userId: user?.id, ip: clientIP });
      return NextResponse.json({ error: "Code invalide" }, { status: 401 });
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
      return NextResponse.json({ error: "Code invalide" }, { status: 401 });
    }

    clearFailedLoginAttempts(clientIP);

    const ssoUser: SsoUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId ?? null,
      tokenVersion: user.tokenVersion,
    };

    const response = NextResponse.json({ success: true, redirect: redirect ?? "/" });
    await issueSession(response, ssoUser);
    return response;
  } catch (error) {
    console.error("SSO login MFA error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
