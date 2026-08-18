import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { MembershipService } from "@/services/MembershipService";

/**
 * GET /api/internal/memberships/active?teamId=&userId=
 * OB-002/OB-003 : seule source de vérité pour "cet utilisateur a un
 * membership actif pour ce club" — consommée par club-ob (espace membre) et
 * par ticketing (règle serveur de prévente, jamais un claim client).
 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const teamId = request.nextUrl.searchParams.get("teamId");
  const userId = request.nextUrl.searchParams.get("userId");
  if (!teamId || !userId) {
    return NextResponse.json({ error: "teamId and userId are required" }, { status: 400 });
  }

  const active = await new MembershipService().findActiveForUser(teamId, userId);
  return NextResponse.json({ active });
}
