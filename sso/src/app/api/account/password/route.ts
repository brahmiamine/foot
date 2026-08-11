import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, issueSession } from "@/lib/session";
import { changePassword } from "@/lib/passwordReset";
import { getClientIP } from "@/lib/getClientIP";
import { logSecurityEvent } from "@/lib/securityLog";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Changement de mot de passe pour un compte déjà connecté (portail `/`,
 * formulaire sur /account/password) — distinct de /api/reset-password (lien
 * email, compte non connecté). Toujours authentifié par cookie : jamais un
 * appel serveur-à-serveur, c'est une action volontaire de l'utilisateur.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword) {
      return NextResponse.json({ error: "Mot de passe actuel requis" }, { status: 400 });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères` },
        { status: 400 },
      );
    }

    const result = await changePassword(session.id, currentPassword, newPassword);
    if (!result.success) {
      logSecurityEvent({ type: "PASSWORD_CHANGE_FAILED", userId: session.id, ip: getClientIP(request) });
      const message =
        result.error === "invalid_current_password" ? "Mot de passe actuel incorrect." : "Ce compte est désactivé.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    logSecurityEvent({ type: "PASSWORD_CHANGED", userId: session.id, ip: getClientIP(request) });

    const response = NextResponse.json({ success: true });
    await issueSession(response, {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      teamId: result.user.teamId ?? null,
      tokenVersion: result.user.tokenVersion,
    });
    return response;
  } catch (error) {
    console.error("SSO change-password error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
