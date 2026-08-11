import { NextRequest, NextResponse } from "next/server";
import { acceptClubInvitation } from "@/lib/clubInvitations";
import { issueSession } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";

export const runtime = "nodejs";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_or_expired_token: "Ce lien d'invitation est invalide ou a expiré.",
  invalid: "Nom ou mot de passe invalide (8 caractères minimum).",
  email_taken: "Un compte existe déjà avec cet email.",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    const name = typeof body.name === "string" ? body.name : "";
    const password = typeof body.password === "string" ? body.password : "";
    const redirect = sanitizeRedirect(typeof body.redirect === "string" ? body.redirect : null);

    if (!token) {
      return NextResponse.json({ error: "Jeton requis" }, { status: 400 });
    }

    const result = await acceptClubInvitation(token, name, password);
    if (!result.ok) {
      return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
    }

    // Compte créé, connecté immédiatement — même comportement que
    // /api/register et /api/reset-password (pas d'étape de login séparée).
    const response = NextResponse.json({ success: true, redirect: redirect ?? "/" });
    await issueSession(response, result.user);
    return response;
  } catch (error) {
    console.error("SSO invitation accept error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
