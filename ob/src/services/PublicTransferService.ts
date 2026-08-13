import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { PlayerTransfer } from "@/entities/PlayerTransfer";
import { Team } from "@/entities/Team";

export interface PublicTransfer {
  id: string;
  playerNameFr: string;
  playerNumber: number | null;
  direction: "IN" | "OUT";
  otherTeamName: string;
  otherTeamNameAr: string | null;
  transferredAt: Date;
}

/**
 * Derniers transferts du club (arrivées/départs), pour la section publique
 * « Mercato » de la page d'accueil — lecture seule sur `player_transfers`
 * (table possédée par superadmin, voir db/OWNERSHIP.md).
 */
export class PublicTransferService {
  async getRecent(teamId: string, limit = 6): Promise<PublicTransfer[]> {
    const ds = await getDataSource();
    const transfers = await ds
      .getRepository(PlayerTransfer)
      .createQueryBuilder("t")
      .where("t.from_team_id = :teamId OR t.to_team_id = :teamId", { teamId })
      .orderBy("t.transferred_at", "DESC")
      .limit(limit)
      .getMany();
    if (transfers.length === 0) return [];

    const otherTeamIds = Array.from(
      new Set(transfers.map((t) => (t.fromTeamId === teamId ? t.toTeamId : t.fromTeamId))),
    );
    const teams = await ds.getRepository(Team).find({ where: { id: In(otherTeamIds) } });
    const teamById = new Map(teams.map((t) => [t.id, t]));

    return transfers.map((t) => {
      const direction: "IN" | "OUT" = t.toTeamId === teamId ? "IN" : "OUT";
      const otherTeamId = direction === "IN" ? t.fromTeamId : t.toTeamId;
      const otherTeam = teamById.get(otherTeamId);
      return {
        id: t.id,
        playerNameFr: t.playerNameFr,
        playerNumber: t.playerNumber,
        direction,
        otherTeamName: otherTeam?.nom ?? "Club inconnu",
        otherTeamNameAr: otherTeam?.nomAr ?? null,
        transferredAt: t.transferredAt,
      };
    });
  }
}
