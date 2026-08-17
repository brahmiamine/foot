import { getDataSource } from "@/lib/db";
import { Substitution } from "@/entities/Substitution";
import { MatchPeriod } from "@/entities/Card";
import { Repository } from "typeorm";
import { assertSheetEditable } from "./sheetGuard";
import { isDuplicateKeyError } from "@/lib/dbErrors";
import { EventCorrectionService, assertReason } from "./EventCorrectionService";
import { CompetitionMatchProtocolService } from "./CompetitionMatchProtocolService";

interface CreateSubstitutionInput {
  sheetId: number;
  matchId: string;
  teamId: string;
  playerOutId: string;
  playerInId: string;
  minute: number;
  period: MatchPeriod;
  clientRequestId?: string | null;
}

interface CorrectSubstitutionInput {
  playerOutId?: string;
  playerInId?: string;
  minute?: number;
  period?: MatchPeriod;
}

interface Actor {
  reason: string;
  actorUserId: string | null;
  actorName: string | null;
}

export class SubstitutionNotFoundError extends Error {
  constructor() {
    super("Remplacement introuvable.");
    this.name = "SubstitutionNotFoundError";
  }
}

export class SubstitutionAlreadyCancelledError extends Error {
  constructor() {
    super("Ce remplacement a déjà été annulé.");
    this.name = "SubstitutionAlreadyCancelledError";
  }
}

function snapshot(substitution: Substitution) {
  return {
    teamId: substitution.teamId,
    playerOutId: substitution.playerOutId,
    playerInId: substitution.playerInId,
    minute: substitution.minute,
    period: substitution.period,
  };
}

export class SubstitutionService {
  private correctionService = new EventCorrectionService();
  private protocolService = new CompetitionMatchProtocolService();

  private async getRepository(): Promise<Repository<Substitution>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Substitution);
  }

  async findBySheet(sheetId: number, options?: { includeCancelled?: boolean }): Promise<Substitution[]> {
    const repository = await this.getRepository();
    const substitutions = await repository.find({
      where: { sheetId },
      relations: ["playerOut", "playerIn", "team"],
      order: { minute: "ASC" },
    });
    if (options?.includeCancelled) return substitutions;
    return substitutions.filter((s) => !s.cancelledAt);
  }

  async create(data: CreateSubstitutionInput): Promise<Substitution> {
    await assertSheetEditable(data.sheetId);
    const repository = await this.getRepository();
    if (data.clientRequestId) {
      const existing = await repository.findOne({ where: { sheetId: data.sheetId, clientRequestId: data.clientRequestId } });
      if (existing) return existing;
    }
    await this.protocolService.assertSubstitutionAllowed(data.matchId, data.teamId);
    const substitution = repository.create({ ...data, clientRequestId: data.clientRequestId ?? null });
    try {
      return await repository.save(substitution);
    } catch (error) {
      if (data.clientRequestId && isDuplicateKeyError(error)) {
        const existing = await repository.findOne({ where: { sheetId: data.sheetId, clientRequestId: data.clientRequestId } });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async correct(id: number, updates: CorrectSubstitutionInput, actor: Actor): Promise<Substitution> {
    const reason = assertReason(actor.reason);
    const repository = await this.getRepository();
    const substitution = await repository.findOne({ where: { id } });
    if (!substitution) throw new SubstitutionNotFoundError();
    if (substitution.cancelledAt) throw new SubstitutionAlreadyCancelledError();

    await assertSheetEditable(substitution.sheetId, { allowSignedAmendment: true });
    const before = snapshot(substitution);
    if (updates.playerOutId !== undefined) substitution.playerOutId = updates.playerOutId;
    if (updates.playerInId !== undefined) substitution.playerInId = updates.playerInId;
    if (updates.minute !== undefined) substitution.minute = updates.minute;
    if (updates.period !== undefined) substitution.period = updates.period;

    const saved = await repository.save(substitution);
    await this.correctionService.record({
      sheetId: saved.sheetId,
      matchId: saved.matchId,
      eventType: "SUBSTITUTION",
      eventId: saved.id,
      action: "CORRECTED",
      before,
      after: snapshot(saved),
      reason,
      actorUserId: actor.actorUserId,
      actorName: actor.actorName,
    });
    return saved;
  }

  async cancel(id: number, actor: Actor): Promise<Substitution> {
    const reason = assertReason(actor.reason);
    const repository = await this.getRepository();
    const substitution = await repository.findOne({ where: { id } });
    if (!substitution) throw new SubstitutionNotFoundError();
    if (substitution.cancelledAt) throw new SubstitutionAlreadyCancelledError();

    await assertSheetEditable(substitution.sheetId, { allowSignedAmendment: true });
    const before = snapshot(substitution);
    substitution.cancelledAt = new Date();
    substitution.cancelledReason = reason;
    const saved = await repository.save(substitution);
    await this.correctionService.record({
      sheetId: saved.sheetId,
      matchId: saved.matchId,
      eventType: "SUBSTITUTION",
      eventId: saved.id,
      action: "CANCELLED",
      before,
      after: null,
      reason,
      actorUserId: actor.actorUserId,
      actorName: actor.actorName,
    });
    return saved;
  }

  async delete(id: number): Promise<void> {
    const repository = await this.getRepository();
    await repository.delete({ id });
  }
}
