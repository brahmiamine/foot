import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listClubSanctionsForClub } from "@/services/ClubSanctionService";
export const runtime = "nodejs";

/** Lecture seule : un club consulte ses propres sanctions fédérales, jamais celles d'un autre club. Aucune écriture côté club-hub (§2, "les clubs ne doivent jamais pouvoir valider eux-mêmes un processus réglementaire fédéral"). */
export async function GET() {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listClubSanctionsForClub(session.user.teamId));
  } catch (error) {
    console.error("Error loading club sanctions:", error);
    return NextResponse.json({ error: "Erreur lors du chargement des sanctions" }, { status: 500 });
  }
}
