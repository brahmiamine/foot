import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { addMemberAffiliation, listMemberAffiliations } from "@/lib/memberAffiliations";

/**
 * Clubs suivis par le membre connecté (préférences supporter). Distinct de
 * `session.teamId` (réservé au staff) : voir README racine, section
 * « Billetterie : séparer l'identité du supporter de l'organisateur de
 * l'événement ». Consommé par les apps génériques (ex. `ob`, billetterie)
 * pour personnaliser l'affichage — jamais pour restreindre un achat.
 */
export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "MEMBER") {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const teams = await listMemberAffiliations(session.id);
  return NextResponse.json({ teams });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role !== "MEMBER") {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const teamId = typeof body?.teamId === "string" ? body.teamId : "";
  if (!teamId) {
    return NextResponse.json({ error: "teamId requis" }, { status: 400 });
  }

  const result = await addMemberAffiliation(session.id, teamId);
  if (!result.ok) {
    return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
  }

  const teams = await listMemberAffiliations(session.id);
  return NextResponse.json({ teams }, { status: 201 });
}
