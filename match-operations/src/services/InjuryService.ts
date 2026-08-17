import { getDataSource } from "@/lib/db";
import { Injury } from "@/entities/Injury";
import { MatchPeriod } from "@/entities/Card";
import { Repository } from "typeorm";
import { assertSheetEditable } from "./sheetGuard";
import { isDuplicateKeyError } from "@/lib/dbErrors";
import { EventCorrectionService, assertReason } from "./EventCorrectionService";

interface CreateInjuryInput {
  sheetId: number;
  matchId: string;
  teamId: string;
  playerId?: string | null;
  minute?: number | null;
  period?: MatchPeriod | null;
  description?: string | null;
  requiresSubstitution?: boolean;
  clientRequestId?: string | null;
}

interface CorrectInjuryInput {
  playerId?: string | null;
  minute?: number | null;
  period?: MatchPeriod | null;
  description?: string | null;
  requiresSubstitution?: boolean;
}

interface Actor {
  reason: string;
  actorUserId: string | null;
  actorName: string | null;
}

export class InjuryNotFoundError extends Error {
  constructor() {
    super("Blessure introuvable.");
    this.name = "InjuryNotFoundError";
  }
}

export class InjuryAlreadyCancelledError extends Error {
  constructor() {
    super("Cette blessure a déjà été annulée.");
    this.name = "InjuryAlreadyCancelledError";
  }
}

function snapshot(injury: Injury) {
  return {
    playerId: injury.playerId,
    teamId: injury.teamId,
    minute: injury.minute,
    period: injury.period,
    description: injury.description,
    requiresSubstitution: injury.requiresSubstitution,
  };
}

export class InjuryService {
  private correctionService = new EventCorrectionService();

  private async getRepository(): Promise<Repository<Injury>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Injury);
  }

  async findBySheet(sheetId: number, options?: { includeCancelled?: boolean }): Promise<Injury[]> {
    const repository = await this.getRepository();
    const injuries = await repository.find({ where: { sheetId }, relations: ["player", "team"], order: { createdAt: "ASC" } });
    if (options?.includeCancelled) return injuries;
    return injuries.filter((i) => !i.cancelledAt);
  }

  async create(data: CreateInjuryInput): Promise<Injury> {
    await assertSheetEditable(data.sheetId);
    const repository = await this.getRepository();
    const injury = repository.create({
      sheetId: data.sheetId,
      matchId: data.matchId,
      teamId: data.teamId,
      playerId: data.playerId ?? null,
      minute: data.minute ?? null,
      period: data.period ?? null,
      description: data.description ?? null,
      requiresSubstitution: data.requiresSubstitution ?? false,
      clientRequestId: data.clientRequestId ?? null,
    });
    try {
      return await repository.save(injury);
    } catch (error) {
      if (data.clientRequestId && isDuplicateKeyError(error)) {
        const existing = await repository.findOne({ where: { sheetId: data.sheetId, clientRequestId: data.clientRequestId } });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async correct(id: number, updates: CorrectInjuryInput, actor: Actor): Promise<Injury> {
    const reason = assertReason(actor.reason);
    const repository = await this.getRepository();
    const injury = await repository.findOne({ where: { id } });
    if (!injury) throw new InjuryNotFoundError();
    if (injury.cancelledAt) throw new InjuryAlreadyCancelledError();

    await assertSheetEditable(injury.sheetId, { allowSignedAmendment: true });
    const before = snapshot(injury);
    if (updates.playerId !== undefined) injury.playerId = updates.playerId;
    if (updates.minute !== undefined) injury.minute = updates.minute;
    if (updates.period !== undefined) injury.period = updates.period;
    if (updates.description !== undefined) injury.description = updates.description;
    if (updates.requiresSubstitution !== undefined) injury.requiresSubstitution = updates.requiresSubstitution;

    const saved = await repository.save(injury);
    await this.correctionService.record({
      sheetId: saved.sheetId,
      matchId: saved.matchId,
      eventType: "INJURY",
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

  async cancel(id: number, actor: Actor): Promise<Injury> {
    const reason = assertReason(actor.reason);
    const repository = await this.getRepository();
    const injury = await repository.findOne({ where: { id } });
    if (!injury) throw new InjuryNotFoundError();
    if (injury.cancelledAt) throw new InjuryAlreadyCancelledError();

    await assertSheetEditable(injury.sheetId, { allowSignedAmendment: true });
    const before = snapshot(injury);
    injury.cancelledAt = new Date();
    injury.cancelledReason = reason;
    const saved = await repository.save(injury);
    await this.correctionService.record({
      sheetId: saved.sheetId,
      matchId: saved.matchId,
      eventType: "INJURY",
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
