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
 * Service for MatchFormation operations — schéma tactique, workflow
 * d'approbation et verrouillage de la composition.
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
      workflowStatus: "DRAFT",
      workflowVersion: 1,
    });
    return repository.save(formation);
  }

  private ensureWorkflowEditable(formation: MatchFormation): void {
    if (formation.isLocked || formation.workflowStatus === "LOCKED") {
      throw new Error("La composition est verrouillée");
    }
    if (formation.workflowStatus === "APPROVED") {
      throw new Error("La composition approuvée ne peut plus être modifiée");
    }
  }

  async markDraftAfterEdit(teamId: string, ref: MatchRef): Promise<void> {
    const repository = await this.getRepository();
    const formation = await this.findByMatch(teamId, ref);
    if (!formation || formation.workflowStatus !== "PROPOSED") return;
    formation.workflowStatus = "DRAFT";
    formation.proposedBy = null;
    formation.proposedAt = null;
    formation.approvedBy = null;
    formation.approvedAt = null;
    formation.workflowVersion += 1;
    await repository.save(formation);
  }

  async setFormation(teamId: string, ref: MatchRef, formationCode: string): Promise<MatchFormation> {
    const repository = await this.getRepository();
    const formation = await this.getOrCreate(teamId, ref);
    this.ensureWorkflowEditable(formation);
    if (formation.formation !== formationCode) {
      formation.formation = formationCode;
      await repository.save(formation);
      await this.markDraftAfterEdit(teamId, ref);
    }
    return (await this.findByMatch(teamId, ref)) ?? formation;
  }

  async setLocked(teamId: string, ref: MatchRef, isLocked: boolean): Promise<MatchFormation> {
    const repository = await this.getRepository();
    const formation = await this.getOrCreate(teamId, ref);
    formation.isLocked = isLocked;
    if (isLocked) {
      formation.workflowStatus = "LOCKED";
      formation.workflowVersion += 1;
    }
    return repository.save(formation);
  }

  /**
   * Un match terminé/annulé, une composition APPROVED ou LOCKED interdit toute
   * modification. `APPROVED` reste distinct de `LOCKED` pour permettre au
   * coach de réaliser explicitement le verrouillage final.
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
    return Boolean(
      formation?.isLocked ||
      formation?.workflowStatus === "APPROVED" ||
      formation?.workflowStatus === "LOCKED",
    );
  }
}
