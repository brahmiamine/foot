import { getDataSource } from "@/lib/database";
import { PlayerStat } from "@/entities/PlayerStat";
import { Player } from "@/entities/Player";
import { In, Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";
import type { CreatePlayerStatInput, CsvPlayerStatRow } from "@/types/player-stats";

export interface PlayerStatTotals {
  playerId: string;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  injuriesCount: number;
  trainingsAttended: number;
  trainingsTotal: number;
  entriesCount: number;
}

/** Service for PlayerStat operations (saisie manuelle + import CSV). */
export class PlayerStatService {
  private async getRepository(): Promise<Repository<PlayerStat>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(PlayerStat);
  }

  async findAll(teamId: string): Promise<PlayerStat[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId }, relations: ["player"], order: { createdAt: "DESC" } });
  }

  async findById(id: number, teamId: string): Promise<PlayerStat | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  /** Totaux agrégés par joueur, pour les joueurs des catégories autorisées. */
  async getTotalsByPlayer(teamId: string, categories: "ALL" | AgeCategory[]): Promise<PlayerStatTotals[]> {
    const dataSource = await getDataSource();
    const playerRepository = dataSource.getRepository(Player);
    const players =
      categories === "ALL"
        ? await playerRepository.find({ where: { teamId } })
        : categories.length === 0
          ? []
          : await playerRepository.find({ where: { teamId, category: In(categories) } });

    const stats = await this.findAll(teamId);
    const byPlayer = new Map<string, PlayerStatTotals>();
    for (const player of players) {
      byPlayer.set(player.id, {
        playerId: player.id,
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        injuriesCount: 0,
        trainingsAttended: 0,
        trainingsTotal: 0,
        entriesCount: 0,
      });
    }
    for (const s of stats) {
      const totals = byPlayer.get(s.playerId);
      if (!totals) continue;
      totals.minutesPlayed += s.minutesPlayed;
      totals.goals += s.goals;
      totals.assists += s.assists;
      totals.yellowCards += s.yellowCards;
      totals.redCards += s.redCards;
      totals.injuriesCount += s.injuriesCount;
      totals.trainingsAttended += s.trainingsAttended;
      totals.trainingsTotal += s.trainingsTotal;
      totals.entriesCount += 1;
    }
    return Array.from(byPlayer.values());
  }

  /** Crée une entrée de stats pour chaque joueur sélectionné (mêmes valeurs). */
  async createForPlayers(data: CreatePlayerStatInput, teamId: string, createdBy: string): Promise<PlayerStat[]> {
    const repository = await this.getRepository();
    const rows = data.playerIds.map((playerId) =>
      repository.create({
        teamId,
        playerId,
        matchType: data.matchType ?? null,
        matchId: data.matchType === "OFFICIAL" ? data.matchId ?? null : null,
        friendlyMatchId: data.matchType === "FRIENDLY" ? data.friendlyMatchId ?? null : null,
        season: data.season ?? null,
        minutesPlayed: data.minutesPlayed,
        goals: data.goals,
        assists: data.assists,
        yellowCards: data.yellowCards,
        redCards: data.redCards,
        injuriesCount: data.injuriesCount,
        trainingsAttended: data.trainingsAttended,
        trainingsTotal: data.trainingsTotal,
        notes: data.notes ?? null,
        createdBy,
      })
    );
    return repository.save(rows);
  }

  /** Importe des lignes CSV déjà validées, en résolvant le joueur par son numéro de maillot. */
  async importRows(rows: CsvPlayerStatRow[], teamId: string, createdBy: string): Promise<{ imported: number; skipped: { row: number; reason: string }[] }> {
    const dataSource = await getDataSource();
    const players = await dataSource.getRepository(Player).find({ where: { teamId } });
    const byNumber = new Map(players.map((p) => [p.number, p]));

    const repository = await this.getRepository();
    const skipped: { row: number; reason: string }[] = [];
    const toCreate: PlayerStat[] = [];

    rows.forEach((row, index) => {
      const player = byNumber.get(row.number);
      if (!player) {
        skipped.push({ row: index + 2, reason: `Aucun joueur avec le numéro ${row.number}` });
        return;
      }
      toCreate.push(
        repository.create({
          teamId,
          playerId: player.id,
          season: row.season ?? null,
          minutesPlayed: row.minutesPlayed,
          goals: row.goals,
          assists: row.assists,
          yellowCards: row.yellowCards,
          redCards: row.redCards,
          injuriesCount: row.injuriesCount,
          trainingsAttended: row.trainingsAttended,
          trainingsTotal: row.trainingsTotal,
          notes: row.notes ?? null,
          createdBy,
        })
      );
    });

    if (toCreate.length > 0) {
      await repository.save(toCreate);
    }
    return { imported: toCreate.length, skipped };
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const stat = await this.findById(id, teamId);
    if (!stat) {
      throw new Error("Entrée de statistiques non trouvée");
    }
    await repository.remove(stat);
    return true;
  }
}
