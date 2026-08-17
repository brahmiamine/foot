import { In, type EntityManager } from "typeorm";
import {
  Injury,
  type InjuryDocument,
  type InjurySeverity,
  type InjuryStatus,
  type ReturnToPlayStage,
} from "@/entities/Injury";
import { InjuryFollowUp } from "@/entities/InjuryFollowUp";
import {
  InjuryClearance,
  type InjuryClearanceDecision,
} from "@/entities/InjuryClearance";
import { MedicalSettings } from "@/entities/MedicalSettings";
import { Player } from "@/entities/Player";
import { MedicalServiceBase, parseInjuryDocuments, type CategoryScope } from "./MedicalServiceBase";
import {
  countLatestClearances,
  expectedNextStage,
  requiredClearances,
} from "./returnToPlayPolicy";

export interface InjuryWithPlayer {
  injury: Injury;
  player: Player | null;
}

export interface EffectiveMedicalSettings {
  teamId: string;
  clearanceRequired: boolean;
  severeSecondOpinionRequired: boolean;
  source: "DEFAULT" | "DATABASE";
}

function statusForStage(stage: ReturnToPlayStage): InjuryStatus {
  if (stage === "AVAILABLE") return "RESOLVED";
  if (["INDIVIDUAL", "PARTIAL", "FULL", "CLEARANCE"].includes(stage)) return "RECOVERING";
  return "ONGOING";
}

function isoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export class MedicalInjuryService extends MedicalServiceBase {
  protected async withPlayers(injuries: Injury[]): Promise<InjuryWithPlayer[]> {
    const ds = await this.ds();
    const playerIds = [...new Set(injuries.map((injury) => injury.playerId))];
    const players = playerIds.length
      ? await ds.getRepository(Player).find({ where: { id: In(playerIds) } })
      : [];
    const byId = new Map(players.map((player) => [player.id, player]));
    return injuries.map((injury) => ({ injury, player: byId.get(injury.playerId) ?? null }));
  }

  async rosterInCategories(teamId: string, categories: CategoryScope): Promise<Player[]> {
    const ds = await this.ds();
    const where = categories === "ALL" ? { teamId } : { teamId, category: In(categories) };
    return ds.getRepository(Player).find({ where, order: { number: "ASC" } });
  }

  async listInjuries(
    teamId: string,
    categories: CategoryScope,
    statuses?: InjuryStatus[],
  ): Promise<InjuryWithPlayer[]> {
    const ds = await this.ds();
    const roster = await this.rosterInCategories(teamId, categories);
    const rosterIds = new Set(roster.map((player) => player.id));
    const where = statuses ? { teamId, status: In(statuses) } : { teamId };
    const injuries = await ds.getRepository(Injury).find({
      where,
      order: { injuryDate: "DESC" },
    });
    const scoped = categories === "ALL" ? injuries : injuries.filter((injury) => rosterIds.has(injury.playerId));
    return this.withPlayers(scoped);
  }

  async getInjury(id: number, teamId: string): Promise<Injury | null> {
    const ds = await this.ds();
    return ds.getRepository(Injury).findOne({ where: { id, teamId } });
  }

  async getSettings(teamId: string): Promise<EffectiveMedicalSettings> {
    const ds = await this.ds();
    return this.getSettingsWithManager(ds.manager, teamId);
  }

  private async getSettingsWithManager(manager: EntityManager, teamId: string): Promise<EffectiveMedicalSettings> {
    const row = await manager.getRepository(MedicalSettings).findOne({ where: { teamId } });
    if (!row) {
      return {
        teamId,
        clearanceRequired: true,
        severeSecondOpinionRequired: true,
        source: "DEFAULT",
      };
    }
    return {
      teamId,
      clearanceRequired: Boolean(row.clearanceRequired),
      severeSecondOpinionRequired: Boolean(row.severeSecondOpinionRequired),
      source: "DATABASE",
    };
  }

  async updateSettings(
    teamId: string,
    actorUserId: string,
    values: { clearanceRequired: boolean; severeSecondOpinionRequired: boolean },
  ): Promise<EffectiveMedicalSettings> {
    const ds = await this.ds();
    const repo = ds.getRepository(MedicalSettings);
    const row = (await repo.findOne({ where: { teamId } })) ?? repo.create({ teamId });
    row.clearanceRequired = values.clearanceRequired;
    row.severeSecondOpinionRequired = values.severeSecondOpinionRequired;
    row.updatedBy = actorUserId;
    await repo.save(row);
    return this.getSettings(teamId);
  }

  async createInjury(data: {
    teamId: string;
    playerId: string;
    injuryDate: string;
    zone: string;
    severity: InjurySeverity;
    description?: string;
    diagnosis?: string;
    unavailabilityDays?: number;
    expectedReturnDate?: string;
    progressiveReturn?: boolean;
    progressiveReturnNotes?: string;
    createdBy: string;
  }): Promise<Injury> {
    const ds = await this.ds();
    const repo = ds.getRepository(Injury);
    return repo.save(
      repo.create({
        ...data,
        status: "ONGOING",
        rtpStage: "INJURED",
        rtpVersion: 1,
      }),
    );
  }

  async updateInjury(
    id: number,
    teamId: string,
    data: Partial<{
      zone: string;
      severity: InjurySeverity;
      description: string | null;
      diagnosis: string | null;
      unavailabilityDays: number | null;
      expectedReturnDate: string | null;
      actualReturnDate: string | null;
      progressiveReturn: boolean;
      progressiveReturnNotes: string | null;
      status: InjuryStatus;
    }>,
  ): Promise<Injury | null> {
    const ds = await this.ds();
    const repo = ds.getRepository(Injury);
    const injury = await repo.findOne({ where: { id, teamId } });
    if (!injury) return null;
    if (data.status !== undefined && data.status !== injury.status) {
      throw new Error("Le statut médical est piloté par le workflow Return-to-Play");
    }
    const { status: _ignoredStatus, ...editableData } = data;
    Object.assign(injury, editableData);
    return repo.save(injury);
  }

  async listFollowUps(id: number, teamId: string): Promise<InjuryFollowUp[]> {
    const ds = await this.ds();
    return ds.getRepository(InjuryFollowUp).find({
      where: { injuryId: id, teamId },
      order: { createdAt: "DESC" },
    });
  }

  async appendFollowUpNote(
    id: number,
    teamId: string,
    note: string,
    authorUserId: string,
  ): Promise<InjuryFollowUp | null> {
    const normalized = note.trim();
    if (normalized.length < 2) throw new Error("La note de suivi est obligatoire");
    const ds = await this.ds();
    const injury = await ds.getRepository(Injury).findOne({ where: { id, teamId } });
    if (!injury) return null;
    const repo = ds.getRepository(InjuryFollowUp);
    return repo.save(
      repo.create({
        injuryId: id,
        teamId,
        authorUserId,
        entryType: "NOTE",
        note: normalized,
        metadata: null,
      }),
    );
  }

  async transitionReturnToPlay(
    id: number,
    teamId: string,
    targetStage: ReturnToPlayStage,
    actorUserId: string,
    note?: string,
  ): Promise<Injury> {
    const ds = await this.ds();
    return ds.transaction(async (manager) => {
      const injuryRepo = manager.getRepository(Injury);
      const injury = await injuryRepo
        .createQueryBuilder("injury")
        .setLock("pessimistic_write")
        .where("injury.id = :id AND injury.teamId = :teamId", { id, teamId })
        .getOne();
      if (!injury) throw new Error("Blessure introuvable");
      if (injury.rtpStage === "AVAILABLE") throw new Error("Le joueur est déjà déclaré disponible");
      if (injury.rtpStage === "CLEARANCE") {
        throw new Error("La sortie de CLEARANCE nécessite une décision médicale de clearance");
      }

      const settings = await this.getSettingsWithManager(manager, teamId);
      const expected = expectedNextStage(injury.rtpStage, settings);
      if (!expected || targetStage !== expected) {
        throw new Error(`Transition Return-to-Play invalide : ${injury.rtpStage} → ${targetStage}`);
      }

      const fromStage = injury.rtpStage;
      injury.rtpStage = targetStage;
      injury.rtpVersion += 1;
      injury.status = statusForStage(targetStage);
      injury.progressiveReturn = ["INDIVIDUAL", "PARTIAL", "FULL", "CLEARANCE"].includes(targetStage);
      if (targetStage === "AVAILABLE") injury.actualReturnDate = isoDate();
      await injuryRepo.save(injury);

      const followUpRepo = manager.getRepository(InjuryFollowUp);
      await followUpRepo.save(
        followUpRepo.create({
          injuryId: injury.id,
          teamId,
          authorUserId: actorUserId,
          entryType: "RTP_TRANSITION",
          note: note?.trim() || `Return-to-Play : ${fromStage} → ${targetStage}`,
          metadata: { fromStage, toStage: targetStage, rtpVersion: injury.rtpVersion },
        }),
      );
      return injury;
    });
  }

  async listClearances(id: number, teamId: string): Promise<InjuryClearance[]> {
    const ds = await this.ds();
    return ds.getRepository(InjuryClearance).find({
      where: { injuryId: id, teamId },
      order: { createdAt: "DESC" },
    });
  }

  async recordClearance(
    id: number,
    teamId: string,
    reviewerUserId: string,
    decision: InjuryClearanceDecision,
    notes?: string,
  ): Promise<{ injury: Injury; requiredClearances: number; currentClearances: number }> {
    const ds = await this.ds();
    return ds.transaction(async (manager) => {
      const injuryRepo = manager.getRepository(Injury);
      const injury = await injuryRepo
        .createQueryBuilder("injury")
        .setLock("pessimistic_write")
        .where("injury.id = :id AND injury.teamId = :teamId", { id, teamId })
        .getOne();
      if (!injury) throw new Error("Blessure introuvable");
      if (injury.rtpStage !== "CLEARANCE") {
        throw new Error("La clearance n'est possible qu'à l'étape CLEARANCE");
      }

      const clearanceRepo = manager.getRepository(InjuryClearance);
      await clearanceRepo.save(
        clearanceRepo.create({
          injuryId: id,
          teamId,
          reviewerUserId,
          decision,
          notes: notes?.trim() || null,
        }),
      );

      const followUpRepo = manager.getRepository(InjuryFollowUp);
      await followUpRepo.save(
        followUpRepo.create({
          injuryId: id,
          teamId,
          authorUserId: reviewerUserId,
          entryType: "CLEARANCE_DECISION",
          note: notes?.trim() || (decision === "CLEAR" ? "Avis favorable de clearance" : "Clearance refusée"),
          metadata: { decision },
        }),
      );

      const settings = await this.getSettingsWithManager(manager, teamId);
      const needed = requiredClearances(injury.severity, settings);
      const decisions = await clearanceRepo.find({
        where: { injuryId: id, teamId },
        order: { createdAt: "ASC" },
      });
      const current = countLatestClearances(decisions);

      if (current >= needed) {
        const fromStage = injury.rtpStage;
        injury.rtpStage = "AVAILABLE";
        injury.rtpVersion += 1;
        injury.status = "RESOLVED";
        injury.progressiveReturn = false;
        injury.actualReturnDate = isoDate();
        await injuryRepo.save(injury);
        await followUpRepo.save(
          followUpRepo.create({
            injuryId: id,
            teamId,
            authorUserId: reviewerUserId,
            entryType: "RTP_TRANSITION",
            note: "Clearance médicale satisfaite : joueur disponible",
            metadata: {
              fromStage,
              toStage: "AVAILABLE",
              requiredClearances: needed,
              currentClearances: current,
              rtpVersion: injury.rtpVersion,
            },
          }),
        );
      }

      return { injury, requiredClearances: needed, currentClearances: current };
    });
  }

  async addDocument(id: number, teamId: string, document: InjuryDocument): Promise<Injury | null> {
    const ds = await this.ds();
    const repo = ds.getRepository(Injury);
    const injury = await repo.findOne({ where: { id, teamId } });
    if (!injury) return null;
    const documents = parseInjuryDocuments(injury.documents);
    documents.push(document);
    injury.documents = JSON.stringify(documents);
    return repo.save(injury);
  }
}
