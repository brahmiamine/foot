import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/passwordReset";
import { getClientIP } from "@/lib/getClientIP";
import { isPasswordResetRateLimited, recordPasswordResetAttempt } from "@/lib/passwordResetRateLimit";
import { logSecurityEvent } from "@/lib/securityLog";

export const runtime = "nodejs";

const GENERIC_MESSAGE =
  "Si un compte existe avec cet email, un lien de réinitialisation vient de lui être envoyé.";

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);

    if (isPasswordResetRateLimited(clientIP)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }
    recordPasswordResetAttempt(clientIP);

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    logSecurityEvent({ type: "PASSWORD_RESET_REQUESTED", email, ip: clientIP });

    // Ne jamais laisser une erreur d'envoi d'email (ou toute autre) fuiter
    // d'information sur l'existence du compte — toujours le même message.
    await requestPasswordReset(email).catch((error) => {
      console.error("requestPasswordReset error:", error);
    });

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("SSO forgot-password error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
