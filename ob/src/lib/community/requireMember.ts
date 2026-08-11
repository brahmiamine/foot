import { NextResponse } from "next/server";
import { getSessionMember, type SessionMember } from "@/lib/community/member";

export type RequireMemberResult = { ok: true; data: SessionMember } | { ok: false; response: NextResponse };

/** Authentification + garde-fou "membre bloqué" partagés par les routes API communauté. */
export async function requireMember(): Promise<RequireMemberResult> {
  const data = await getSessionMember();
  if (!data) {
    return { ok: false, response: NextResponse.json({ error: "Connexion requise" }, { status: 401 }) };
  }
  if (data.member.isBlocked) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Votre compte a été suspendu de la communauté." }, { status: 403 }),
    };
  }
  return { ok: true, data };
}
