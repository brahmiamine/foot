import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { createTransfer, PlayerTransferError } from "@/services/PlayerTransferService";

export const runtime = "nodejs";

/**
 * POST /api/internal/player-transfers — migration.md §19, service-à-service
 * uniquement (x-api-key, voir lib/serviceAuth.ts). Appelée par `superadmin`
 * (fédération/ligue, homologation) pour ouvrir un dossier de transfert.
 * Ne mute ni Player ni cms_team_members — voir .../[id]/complete.
 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const {
      playerId,
      fromTeamId,
      toTeamId,
      transferType,
      effectiveDate,
      seasonId,
      fee,
      currency,
      loanStartDate,
      loanEndDate,
      notes,
      createdBy,
    } = body;

    if (!playerId || !fromTeamId || !toTeamId || !transferType || !effectiveDate) {
      return NextResponse.json(
        { error: "playerId, fromTeamId, toTeamId, transferType et effectiveDate sont requis" },
        { status: 400 },
      );
    }

    const transfer = await createTransfer({
      playerId,
      fromTeamId,
      toTeamId,
      transferType,
      effectiveDate,
      seasonId,
      fee,
      currency,
      loanStartDate,
      loanEndDate,
      notes,
      createdBy,
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    if (error instanceof PlayerTransferError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error creating player transfer:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
