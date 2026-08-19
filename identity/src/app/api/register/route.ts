import { NextRequest, NextResponse } from "next/server";
import { createMemberAccount } from "@/lib/members";
import {
  MemberRegistrationError,
  registerPasswordMemberForClub,
} from "@/lib/memberRegistration";
import { issueSession } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";
import { getClientIP } from "@/lib/getClientIP";
import { isLoginRateLimited, recordFailedLoginAttempt } from "@/lib/loginRateLimit";

export const runtime = "nodejs";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Nom ou mot de passe invalide (8 caractères minimum).",
  email_taken: "Un compte existe déjà avec cet email.",
};

function registrationErrorStatus(error: MemberRegistrationError): number {
  if (error.code === "REGISTRATION_CLOSED" || error.code === "INVITATION_REQUIRED") return 403;
  if (error.code === "EMAIL_TAKEN") return 409;
  return 400;
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);

    if (isLoginRateLimited(clientIP)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name : "";
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const firstName = typeof body.firstName === "string" ? body.firstName : undefined;
    const lastName = typeof body.lastName === "string" ? body.lastName : undefined;
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber : undefined;
    const teamId = typeof body.teamId === "string" && body.teamId.trim() ? body.teamId.trim() : null;
    const invitationToken =
      typeof body.invitationToken === "string" && body.invitationToken.trim()
        ? body.invitationToken.trim()
        : null;
    const redirect = sanitizeRedirect(typeof body.redirect === "string" ? body.redirect : null);

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nom, email et mot de passe requis" }, { status: 400 });
    }

    // Compatibilité historique : sans contexte club, inscription MEMBER globale immédiate.
    if (!teamId) {
      const result = await createMemberAccount(name, email, password, { firstName, lastName, phoneNumber });
      if (!result.ok) {
        recordFailedLoginAttempt(clientIP);
        return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
      }
      const response = NextResponse.json({ success: true, status: "ACTIVE", redirect: redirect ?? "/" });
      await issueSession(response, result.user);
      return response;
    }

    try {
      const result = await registerPasswordMemberForClub({
        teamId,
        name,
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        invitationToken,
      });
      if (result.status === "ACTIVE") {
        const response = NextResponse.json({ success: true, status: result.status, redirect: redirect ?? "/" });
        await issueSession(response, result.user);
        return response;
      }
      return NextResponse.json({ success: true, status: result.status, requestId: result.requestId }, { status: 202 });
    } catch (error) {
      if (error instanceof MemberRegistrationError) {
        recordFailedLoginAttempt(clientIP);
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: registrationErrorStatus(error) },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("SSO register error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
