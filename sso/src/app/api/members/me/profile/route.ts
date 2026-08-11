import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getMemberProfile, updateMemberProfile } from "@/lib/members";

/**
 * Profil "checkout" du membre connecté (firstName/lastName/phoneNumber —
 * voir lib/members.ts pour pourquoi ces champs vivent ici plutôt que dans
 * le JWT). Authentifié par le cookie de session `sso` habituel :
 * - depuis `sso` lui-même (page /membre/profil), le navigateur l'envoie
 *   automatiquement (même origine) ;
 * - depuis une autre app (ex. `billetterie` au moment de payer), l'appel
 *   est serveur-à-serveur et doit transmettre explicitement l'en-tête
 *   Cookie du visiteur (voir billetterie/src/lib/memberProfile.ts) — ce
 *   n'est pas un appel "service" comme ceux de payment-api (pas de clé
 *   d'API), le SSO n'expose jamais le profil d'un membre à qui n'a pas sa
 *   session.
 */
export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "MEMBER") {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const profile = await getMemberProfile(session.id);
  if (!profile) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    email: session.email,
    name: session.name,
    ...profile,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role !== "MEMBER") {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const fields: { firstName?: string; lastName?: string; phoneNumber?: string } = {};
  if (typeof body.firstName === "string") fields.firstName = body.firstName;
  if (typeof body.lastName === "string") fields.lastName = body.lastName;
  if (typeof body.phoneNumber === "string") fields.phoneNumber = body.phoneNumber;

  const profile = await updateMemberProfile(session.id, fields);
  if (!profile) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  return NextResponse.json({ email: session.email, name: session.name, ...profile });
}
