import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/passwordReset";
import { getClientIP } from "@/lib/getClientIP";
import { logSecurityEvent } from "@/lib/securityLog";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token) {
      return NextResponse.json({ error: "Jeton requis" }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères` },
        { status: 400 }
      );
    }

    const result = await resetPassword(token, password);
    if (!result.success) {
      logSecurityEvent({ type: "PASSWORD_RESET_FAILED", ip: clientIP });
      const message =
        result.error === "invalid_or_expired_token"
          ? "Ce lien de réinitialisation est invalide ou a expiré."
          : "Ce compte est désactivé.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    logSecurityEvent({ type: "PASSWORD_RESET_COMPLETED", ip: clientIP });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SSO reset-password error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
