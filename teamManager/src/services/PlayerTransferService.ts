import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { PlayerTransfer } from "@/entities/PlayerTransfer";
import { Team } from "@/entities/Team";

export interface TransferHistoryEntry {
  id: string;
  playerId: string;
  playerNameFr: string;
  playerNumber: number | null;
  direction: "IN" | "OUT";
  otherTeamId: string;
  otherTeamName: string;
  note: string | null;
  transferredAt: Date;
}

/**
 * Historique en lecture seule des transferts touchant le club — table
 * `player_transfers` possédée par `superadmin` (voir db/OWNERSHIP.md et
 * services/PlayerService.ts pour `Player` lui-même). teamManager n'écrit
 * jamais cette table : le transfert reste une opération administrative
 * centrale pilotée depuis superadmin.
 */
export class PlayerTransferService {
  async listForTeam(teamId: string): Promise<TransferHistoryEntry[]> {
    const ds = await getDataSource();
    const transfers = await ds
      .getRepository(PlayerTransfer)
      .createQueryBuilder("t")
      .where("t.from_team_id = :teamId OR t.to_team_id = :teamId", { teamId })
      .orderBy("t.transferred_at", "DESC")
      .limit(200)
      .getMany();
    if (transfers.length === 0) return [];

    const otherTeamIds = Array.from(
      new Set(transfers.map((t) => (t.fromTeamId === teamId ? t.toTeamId : t.fromTeamId))),
    );
    const teams = await ds.getRepository(Team).find({ where: { id: In(otherTeamIds) } });
    const teamById = new Map(teams.map((t) => [t.id, t.nom]));

    return transfers.map((t) => {
      const direction: "IN" | "OUT" = t.toTeamId === teamId ? "IN" : "OUT";
      const otherTeamId = direction === "IN" ? t.fromTeamId : t.toTeamId;
      return {
        id: t.id,
        playerId: t.playerId,
        playerNameFr: t.playerNameFr,
        playerNumber: t.playerNumber,
        direction,
        otherTeamId,
        otherTeamName: teamById.get(otherTeamId) ?? "Club inconnu",
        note: t.note,
        transferredAt: t.transferredAt,
      };
    });
  }
}
