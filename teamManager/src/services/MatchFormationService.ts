import { getDataSource } from "@/lib/database";
import { MatchFormation, MatchKind } from "@/entities/MatchFormation";
import { Match } from "@/entities/Match";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { Repository } from "typeorm";

export interface MatchRef {
  matchType: MatchKind;
  matchId?: string | null;
  friendlyMatchId?: number | null;
}

/**
 * Service for MatchFormation operations — schéma tactique (ex: "4-3-3") et
 * verrouillage de la composition, pour un match officiel ou amical.
 */
export class MatchFormationService {
  private async getRepository(): Promise<Repository<MatchFormation>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MatchFormation);
  }

  async findByMatch(teamId: string, ref: MatchRef): Promise<MatchFormation | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where:
        ref.matchType === "OFFICIAL"
          ? { teamId, matchType: "OFFICIAL", matchId: ref.matchId ?? undefined }
          : { teamId, matchType: "FRIENDLY", friendlyMatchId: ref.friendlyMatchId ?? undefined },
    });
  }

  async getOrCreate(teamId: string, ref: MatchRef): Promise<MatchFormation> {
    const repository = await this.getRepository();
    const existing = await this.findByMatch(teamId, ref);
    if (existing) return existing;

    const formation = repository.create({
      teamId,
      matchType: ref.matchType,
      matchId: ref.matchType === "OFFICIAL" ? ref.matchId : null,
      friendlyMatchId: ref.matchType === "FRIENDLY" ? ref.friendlyMatchId : null,
      formation: "4-3-3",
      isLocked: false,
    });
    return repository.save(formation);
  }

  async setFormation(teamId: string, ref: MatchRef, formationCode: string): Promise<MatchFormation> {
    const repository = await this.getRepository();
    const formation = await this.getOrCreate(teamId, ref);
    formation.formation = formationCode;
    return repository.save(formation);
  }

  async setLocked(teamId: string, ref: MatchRef, isLocked: boolean): Promise<MatchFormation> {
    const repository = await this.getRepository();
    const formation = await this.getOrCreate(teamId, ref);
    formation.isLocked = isLocked;
    return repository.save(formation);
  }

  /**
   * Un match terminé/annulé verrouille définitivement sa composition — même
   * sans verrouillage manuel. Vérifié avant toute écriture sur la
   * composition (MatchLineupService.saveLineup) ou l'envoi de convocations.
   */
  async isEffectivelyLocked(teamId: string, ref: MatchRef): Promise<boolean> {
    const dataSource = await getDataSource();

    if (ref.matchType === "OFFICIAL" && ref.matchId) {
      const match = await dataSource.getRepository(Match).findOne({ where: { id: ref.matchId } });
      if (match && (match.status === "FINISHED" || match.status === "CANCELLED")) return true;
    }
    if (ref.matchType === "FRIENDLY" && ref.friendlyMatchId) {
      const friendly = await dataSource
        .getRepository(FriendlyMatch)
        .findOne({ where: { id: ref.friendlyMatchId, teamId } });
      if (friendly && (friendly.status === "FINISHED" || friendly.status === "CANCELLED")) return true;
    }

    const formation = await this.findByMatch(teamId, ref);
    return formation?.isLocked ?? false;
  }
}
