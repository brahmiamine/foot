import { NextRequest, NextResponse } from "next/server";
import { createMemberAccount } from "@/lib/members";
import { issueSession } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";
import { getClientIP } from "@/lib/getClientIP";
import { isLoginRateLimited, recordFailedLoginAttempt } from "@/lib/loginRateLimit";

export const runtime = "nodejs";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Nom ou mot de passe invalide (8 caractères minimum).",
  email_taken: "Un compte existe déjà avec cet email.",
};

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);

    if (isLoginRateLimited(clientIP)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name : "";
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const redirect = sanitizeRedirect(typeof body.redirect === "string" ? body.redirect : null);
    // Optionnels à dessein (voir lib/members.ts) : ne pas bloquer
    // l'inscription si non renseignés, requis seulement plus tard par
    // billetterie si le membre paie via Paymee.
    const firstName = typeof body.firstName === "string" ? body.firstName : undefined;
    const lastName = typeof body.lastName === "string" ? body.lastName : undefined;
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber : undefined;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nom, email et mot de passe requis" }, { status: 400 });
    }

    const result = await createMemberAccount(name, email, password, { firstName, lastName, phoneNumber });
    if (!result.ok) {
      recordFailedLoginAttempt(clientIP);
      return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, redirect: redirect ?? "/" });
    await issueSession(response, result.user);
    return response;
  } catch (error) {
    console.error("SSO register error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
