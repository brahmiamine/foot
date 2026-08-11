import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/requestSession";
import { getMemberProfile, updateMemberProfile } from "@/lib/members";

/**
 * Profil étendu du membre connecté (firstName/lastName/phoneNumber),
 * distinct de /api/members/me/affiliations. Authentifié soit par le cookie
 * de session (ob : page profil), soit par `Authorization: Bearer <token>`
 * pour un appel serveur-à-serveur — billetterie relaie le jeton du membre
 * avant d'initier un paiement Paymee (voir billetterie/src/lib/ssoProfileClient.ts),
 * même convention que notification-api pour les apps clientes.
 */
export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session || session.role !== "MEMBER") {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const profile = await getMemberProfile(session.id);
  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PATCH(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session || session.role !== "MEMBER") {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const firstName = typeof body.firstName === "string" ? body.firstName : undefined;
  const lastName = typeof body.lastName === "string" ? body.lastName : undefined;
  const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber : undefined;

  await updateMemberProfile(session.id, { firstName, lastName, phoneNumber });

  const profile = await getMemberProfile(session.id);
  return NextResponse.json(profile);
}
