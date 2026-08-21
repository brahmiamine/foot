import { MatchLineup, type LineupRole } from "@/entities/MatchLineup";
import {
  MatchFormation,
  type FormationWorkflowStatus,
} from "@/entities/MatchFormation";
import { TacticsBoard } from "@/entities/TacticsBoard";
import { PlayerAvailabilityDeclaration } from "@/entities/PlayerAvailabilityDeclaration";
import type { AgeCategory } from "@/types/categories";
import { StaffConvocationService } from "./StaffConvocationService";
import type { CategoryScope } from "./StaffServiceBase";

export class StaffLineupService extends StaffConvocationService {
  /**
   * PLAYER-002 — consommation en lecture de la disponibilité déclarée par le
   * joueur (source de vérité : player-hub). `null` si aucune déclaration ne
   * couvre la date du match : absence de déclaration = disponible par défaut.
   */
  async getPlayerAvailabilityDeclaration(
    teamId: string,
    playerId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<PlayerAvailabilityDeclaration | null> {
    const kickoff = await this.resolveKickoff(teamId, matchType, matchId, friendlyMatchId);
    if (!kickoff) return null;
    const date = kickoff.toISOString().slice(0, 10);
    const ds = await this.ds();
    const declarations = await ds.getRepository(PlayerAvailabilityDeclaration).find({ where: { playerId } });
    return (
      declarations.find(
        (declaration) => !declaration.cancelledAt && declaration.startDate <= date && date <= declaration.endDate,
      ) ?? null
    );
  }

  async getFormation(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<MatchFormation | null> {
    const ds = await this.ds();
    return ds.getRepository(MatchFormation).findOne({
      where:
        matchType === "OFFICIAL"
          ? { teamId, matchType, matchId }
          : { teamId, matchType, friendlyMatchId },
    });
  }

  private async getOrCreateFormation(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<MatchFormation> {
    const ds = await this.ds();
    const repo = ds.getRepository(MatchFormation);
    const existing = await this.getFormation(teamId, matchType, matchId, friendlyMatchId);
    if (existing) return existing;
    return repo.save(
      repo.create({
        teamId,
        matchType,
        matchId: matchId ?? null,
        friendlyMatchId: friendlyMatchId ?? null,
        formation: "4-3-3",
        isLocked: false,
        workflowStatus: "DRAFT",
        workflowVersion: 1,
      }),
    );
  }

  /** STAFF-002 — le verrouillage automatique s'ajoute au workflow manuel, il ne le remplace pas. */
  private async ensureEditable(
    formation: MatchFormation,
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<void> {
    if (formation.isLocked || formation.workflowStatus === "LOCKED") {
      throw new Error("La composition est verrouillée");
    }
    if (formation.workflowStatus === "APPROVED") {
      throw new Error("La composition approuvée ne peut plus être modifiée");
    }
    if (await this.isLineupAutoLocked(teamId, matchType, matchId, friendlyMatchId)) {
      throw new Error("La composition est verrouillée automatiquement avant le coup d'envoi");
    }
  }

  private async markDraftAfterEdit(formation: MatchFormation): Promise<void> {
    if (formation.workflowStatus !== "PROPOSED") return;
    const ds = await this.ds();
    formation.workflowStatus = "DRAFT";
    formation.proposedBy = null;
    formation.proposedAt = null;
    formation.approvedBy = null;
    formation.approvedAt = null;
    formation.workflowVersion += 1;
    await ds.getRepository(MatchFormation).save(formation);
  }

  async setFormation(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    formation: string,
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(MatchFormation);
    const entry = await this.getOrCreateFormation(teamId, matchType, matchId, friendlyMatchId);
    await this.ensureEditable(entry, teamId, matchType, matchId, friendlyMatchId);
    if (entry.formation !== formation) {
      entry.formation = formation;
      await repo.save(entry);
      await this.markDraftAfterEdit(entry);
    }
  }

  async getLineup(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<MatchLineup[]> {
    const ds = await this.ds();
    return ds.getRepository(MatchLineup).find({
      where:
        matchType === "OFFICIAL"
          ? { teamId, matchType, matchId }
          : { teamId, matchType, friendlyMatchId },
    });
  }

  async setLineupEntry(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    playerId: string,
    role: LineupRole,
    options: {
      matchId?: string;
      friendlyMatchId?: number;
      shirtNumber?: number | null;
      position?: string | null;
      isCaptain?: boolean;
    },
  ): Promise<void> {
    const formation = await this.getOrCreateFormation(
      teamId,
      matchType,
      options.matchId,
      options.friendlyMatchId,
    );
    await this.ensureEditable(formation, teamId, matchType, options.matchId, options.friendlyMatchId);

    const declaration = await this.getPlayerAvailabilityDeclaration(
      teamId,
      playerId,
      matchType,
      options.matchId,
      options.friendlyMatchId,
    );
    if (declaration?.status === "UNAVAILABLE") {
      throw new Error("Ce joueur s'est déclaré indisponible pour cette période");
    }

    const ds = await this.ds();
    const repo = ds.getRepository(MatchLineup);
    const where =
      matchType === "OFFICIAL"
        ? { teamId, matchType, matchId: options.matchId, playerId }
        : { teamId, matchType, friendlyMatchId: options.friendlyMatchId, playerId };
    let entry = await repo.findOne({ where });
    if (!entry) {
      entry = repo.create({
        teamId,
        matchType,
        matchId: options.matchId ?? null,
        friendlyMatchId: options.friendlyMatchId ?? null,
        playerId,
      });
    }
    entry.role = role;
    entry.shirtNumber = options.shirtNumber ?? null;
    entry.position = options.position ?? null;
    entry.isCaptain = options.isCaptain ?? false;
    await repo.save(entry);
    await this.markDraftAfterEdit(formation);
  }

  async removeLineupEntry(id: number, teamId: string): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(MatchLineup);
    const entry = await repo.findOne({ where: { id, teamId } });
    if (!entry) return;

    const formation = await this.getOrCreateFormation(
      teamId,
      entry.matchType,
      entry.matchId ?? undefined,
      entry.friendlyMatchId ?? undefined,
    );
    await this.ensureEditable(formation, teamId, entry.matchType, entry.matchId ?? undefined, entry.friendlyMatchId ?? undefined);
    await repo.remove(entry);
    await this.markDraftAfterEdit(formation);
  }

  async proposeLineup(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    actorUserId: string,
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<MatchFormation> {
    const ds = await this.ds();
    const repo = ds.getRepository(MatchFormation);
    const formation = await this.getOrCreateFormation(teamId, matchType, matchId, friendlyMatchId);
    await this.ensureEditable(formation, teamId, matchType, matchId, friendlyMatchId);
    const lineup = await this.getLineup(teamId, matchType, matchId, friendlyMatchId);
    if (lineup.length === 0) throw new Error("Ajoutez au moins un joueur avant de soumettre la composition");

    formation.workflowStatus = "PROPOSED";
    formation.proposedBy = actorUserId;
    formation.proposedAt = new Date();
    formation.approvedBy = null;
    formation.approvedAt = null;
    formation.workflowVersion += 1;
    return repo.save(formation);
  }

  async approveLineup(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    actorUserId: string,
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<MatchFormation> {
    const ds = await this.ds();
    const repo = ds.getRepository(MatchFormation);
    const formation = await this.getOrCreateFormation(teamId, matchType, matchId, friendlyMatchId);
    if (formation.workflowStatus !== "PROPOSED") {
      throw new Error("La composition doit être proposée avant approbation");
    }
    if (formation.proposedBy === actorUserId) {
      throw new Error("Le proposant ne peut pas approuver sa propre composition");
    }

    formation.workflowStatus = "APPROVED";
    formation.approvedBy = actorUserId;
    formation.approvedAt = new Date();
    formation.workflowVersion += 1;
    return repo.save(formation);
  }

  async lockLineup(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    actorUserId: string,
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<MatchFormation> {
    const ds = await this.ds();
    const repo = ds.getRepository(MatchFormation);
    const formation = await this.getOrCreateFormation(teamId, matchType, matchId, friendlyMatchId);
    if (formation.workflowStatus !== "APPROVED") {
      throw new Error("La composition doit être approuvée avant verrouillage");
    }

    formation.workflowStatus = "LOCKED";
    formation.isLocked = true;
    formation.lockedBy = actorUserId;
    formation.lockedAt = new Date();
    formation.workflowVersion += 1;
    return repo.save(formation);
  }

  async getLineupWorkflowStatus(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    matchId?: string,
    friendlyMatchId?: number,
  ): Promise<FormationWorkflowStatus> {
    const formation = await this.getFormation(teamId, matchType, matchId, friendlyMatchId);
    if (formation?.isLocked) return "LOCKED";
    if (await this.isLineupAutoLocked(teamId, matchType, matchId, friendlyMatchId)) return "LOCKED";
    return formation?.workflowStatus ?? "DRAFT";
  }

  async listTacticsBoards(teamId: string, categories: CategoryScope): Promise<TacticsBoard[]> {
    const ds = await this.ds();
    const boards = await ds.getRepository(TacticsBoard).find({
      where: { teamId },
      order: { createdAt: "DESC" },
    });
    if (categories === "ALL") return boards;
    return boards.filter((board) => !board.category || categories.includes(board.category as AgeCategory));
  }
}
