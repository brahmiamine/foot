import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { createTransfer, listTransfers, PlayerTransferError } from "@/services/PlayerTransferService";
import type { PlayerTransferStatus } from "@/entities/PlayerTransfer";

export const runtime = "nodejs";

const VALID_STATUSES = new Set<PlayerTransferStatus>(["DRAFT", "PENDING", "APPROVED", "COMPLETED", "CANCELLED", "REJECTED"]);

/**
 * GET /api/internal/player-transfers — migration.md §23, service-à-service
 * uniquement. Appelée par `superadmin` pour le tableau de bord Transferts
 * — pas de filtre par fédération ici (voir `listTransfers`), `superadmin`
 * filtre le résultat après coup avec sa propre connaissance des
 * affiliations (`team_affiliations`, absente de cette base).
 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const statusParam = request.nextUrl.searchParams.get("status");
  const status = statusParam && VALID_STATUSES.has(statusParam as PlayerTransferStatus) ? (statusParam as PlayerTransferStatus) : undefined;

  try {
    const transfers = await listTransfers(status);
    return NextResponse.json(transfers);
  } catch (error) {
    console.error("Error listing player transfers:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

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
