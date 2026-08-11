import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/community/requireMember";
import { checkIn } from "@/lib/community/checkin";

export const runtime = "nodejs";

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "Match introuvable.",
  not_live: "Le check-in n'est possible que pendant le match.",
  already: "Vous êtes déjà enregistré pour ce match.",
};

export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  if (!matchId) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const result = await checkIn(auth.data.session.id, matchId);
  if (!result.ok) {
    return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
