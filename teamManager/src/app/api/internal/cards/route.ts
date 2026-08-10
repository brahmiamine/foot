import { NextRequest, NextResponse } from "next/server";
import { ensureInternalAuth } from "@/lib/internalAuth";
import { getDataSource } from "@/lib/database";
import { Player } from "@/entities/Player";
import { CardService, DoubleYellowRequiredError } from "@/services/CardService";

export const runtime = "nodejs";

/**
 * POST /api/internal/cards — appelée par matchsheet quand un carton est
 * donné en direct pendant un match. Réutilise CardService.create() tel
 * quel (amende + vérification de suspension) au lieu de dupliquer cette
 * logique côté matchsheet. `teamId` est déduit du joueur ciblé (pas de
 * session utilisateur ici, l'appel est authentifié par secret partagé).
 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureInternalAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { playerId, matchId, type, minute, period, cardReasonId, commentFr, commentAr, suspendedMatches, createdBy } = body;

    if (!playerId || !matchId || !type || !createdBy) {
      return NextResponse.json({ error: "playerId, matchId, type et createdBy sont requis" }, { status: 400 });
    }

    const dataSource = await getDataSource();
    const player = await dataSource.getRepository(Player).findOne({ where: { id: playerId } });
    if (!player) {
      return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
    }

    const cardService = new CardService();
    const card = await cardService.create(
      { playerId, matchId, type, minute, period, cardReasonId, commentFr, commentAr, suspendedMatches },
      player.teamId,
      createdBy
    );

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    if (error instanceof DoubleYellowRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Error creating card via internal API:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 });
  }
}
