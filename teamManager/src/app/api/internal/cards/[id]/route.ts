import { NextRequest, NextResponse } from "next/server";
import { ensureInternalAuth } from "@/lib/internalAuth";
import { getDataSource } from "@/lib/database";
import { Card } from "@/entities/Card";
import { CardService } from "@/services/CardService";

export const runtime = "nodejs";

/**
 * DELETE /api/internal/cards/[id] — appelée par matchsheet pour annuler un
 * carton saisi en direct. Réutilise CardService.delete() (restaure les
 * jaunes neutralisés, nettoie suspension/amende associées).
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureInternalAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;

    const dataSource = await getDataSource();
    const card = await dataSource.getRepository(Card).findOne({ where: { id }, relations: { player: true } });
    if (!card || !card.player) {
      return NextResponse.json({ error: "Carton introuvable" }, { status: 404 });
    }

    const cardService = new CardService();
    await cardService.delete(id, card.player.teamId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting card via internal API:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 });
  }
}
