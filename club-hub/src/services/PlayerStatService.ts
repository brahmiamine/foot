import { getDataSource } from "@/lib/database";
import { PlayerStat } from "@/entities/PlayerStat";
import { Player } from "@/entities/Player";
import { Match } from "@/entities/Match";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { StatReviewPolicy } from "@/entities/StatReviewPolicy";
import { ClubConfigurationAudit } from "@/entities/ClubConfigurationAudit";
import { In, Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";
import type { CreatePlayerStatInput, CsvPlayerStatRow } from "@/types/player-stats";
import {
  resolvePolicy,
  type PolicyRecord,
} from "../../../packages/domain-contracts/src/policy";
import {
  requireConfigurationChangeReason,
  type ConfigurationAuditContext,
} from "../../../packages/domain-contracts/src/configuration-audit";

const STAT_REVIEW_DEFAULTS = { reviewWindowHours: 72 };

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

  /** STAFF-004 — même fenêtre de revue post-match que staff-hub (`cms_stat_review_policies`) : la suppression d'une entrée liée à un match reste libre tant que la fenêtre n'est pas écoulée, puis exige un motif audité. */
  private async isLocked(teamId: string, stat: PlayerStat, at: Date = new Date()): Promise<boolean> {
    if (!stat.matchId && !stat.friendlyMatchId) return false;
    const dataSource = await getDataSource();
    const matchDate = stat.matchId
      ? (await dataSource.getRepository(Match).findOne({ where: { id: stat.matchId } }))?.date ?? null
      : stat.friendlyMatchId
        ? (await dataSource.getRepository(FriendlyMatch).findOne({ where: { id: stat.friendlyMatchId, teamId } }))?.date ?? null
        : null;
    if (!matchDate) return false;

    const rows = await dataSource.getRepository(StatReviewPolicy).find({ where: { teamId }, order: { version: "DESC" } });
    const records: PolicyRecord<typeof STAT_REVIEW_DEFAULTS>[] = rows.map((row) => ({
      id: row.id,
      scopeType: "CLUB",
      scopeId: row.teamId,
      version: row.version,
      effectiveFrom: row.effectiveFrom,
      effectiveUntil: row.effectiveUntil,
      values: { reviewWindowHours: row.reviewWindowHours },
    }));
    const { values } = resolvePolicy(STAT_REVIEW_DEFAULTS, records, { clubId: teamId }, at);
    return at.getTime() >= matchDate.getTime() + values.reviewWindowHours * 60 * 60_000;
  }

  async delete(
    id: number,
    teamId: string,
    actor: Omit<ConfigurationAuditContext, "reason"> & { reason?: string },
  ): Promise<boolean> {
    const repository = await this.getRepository();
    const stat = await this.findById(id, teamId);
    if (!stat) {
      throw new Error("Entrée de statistiques non trouvée");
    }

    const locked = await this.isLocked(teamId, stat);
    if (locked) {
      const reason = requireConfigurationChangeReason(actor.reason ?? "");
      const dataSource = await getDataSource();
      const auditRepository = dataSource.getRepository(ClubConfigurationAudit);
      await auditRepository.save(
        auditRepository.create({
          domain: "STAFF_PLAYER_STAT_CORRECTION",
          configurationKey: "PLAYER_STAT_DELETION",
          scopeType: "CLUB",
          scopeId: `${teamId}:${id}`,
          previousVersion: null,
          newVersion: 1,
          before: {
            minutesPlayed: stat.minutesPlayed,
            goals: stat.goals,
            assists: stat.assists,
            yellowCards: stat.yellowCards,
            redCards: stat.redCards,
          },
          after: { deleted: true },
          actorUserId: actor.actorUserId,
          actorRole: actor.actorRole,
          reason,
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        }),
      );
    }

    await repository.remove(stat);
    return true;
  }
}
