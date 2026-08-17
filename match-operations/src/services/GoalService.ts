import { getDataSource } from "@/lib/db";
import { Goal } from "@/entities/Goal";
import { MatchPeriod } from "@/entities/Card";
import { Repository } from "typeorm";
import { assertSheetEditable } from "./sheetGuard";
import { isDuplicateKeyError } from "@/lib/dbErrors";
import { EventCorrectionService, assertReason } from "./EventCorrectionService";

interface CreateGoalInput {
  sheetId: number;
  matchId: string;
  teamId: string;
  playerId?: string | null;
  minute: number;
  period: MatchPeriod;
  isOwnGoal?: boolean;
  isPenalty?: boolean;
  clientRequestId?: string | null;
}

interface CorrectGoalInput {
  playerId?: string | null;
  minute?: number;
  period?: MatchPeriod;
  isOwnGoal?: boolean;
  isPenalty?: boolean;
}

interface Actor {
  reason: string;
  actorUserId: string | null;
  actorName: string | null;
}

export class GoalNotFoundError extends Error {
  constructor() {
    super("But introuvable.");
    this.name = "GoalNotFoundError";
  }
}

export class GoalAlreadyCancelledError extends Error {
  constructor() {
    super("Ce but a déjà été annulé.");
    this.name = "GoalAlreadyCancelledError";
  }
}

function snapshot(goal: Goal) {
  return {
    playerId: goal.playerId,
    teamId: goal.teamId,
    minute: goal.minute,
    period: goal.period,
    isOwnGoal: goal.isOwnGoal,
    isPenalty: goal.isPenalty,
  };
}

export class GoalService {
  private correctionService = new EventCorrectionService();

  private async getRepository(): Promise<Repository<Goal>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Goal);
  }

  async findBySheet(sheetId: number, options?: { includeCancelled?: boolean }): Promise<Goal[]> {
    const repository = await this.getRepository();
    const goals = await repository.find({ where: { sheetId }, relations: ["player", "team"], order: { minute: "ASC" } });
    if (options?.includeCancelled) return goals;
    return goals.filter((g) => !g.cancelledAt);
  }

  async create(data: CreateGoalInput): Promise<Goal> {
    await assertSheetEditable(data.sheetId);
    const repository = await this.getRepository();
    const goal = repository.create({
      sheetId: data.sheetId,
      matchId: data.matchId,
      teamId: data.teamId,
      playerId: data.playerId ?? null,
      minute: data.minute,
      period: data.period,
      isOwnGoal: data.isOwnGoal ?? false,
      isPenalty: data.isPenalty ?? false,
      clientRequestId: data.clientRequestId ?? null,
    });
    try {
      return await repository.save(goal);
    } catch (error) {
      if (data.clientRequestId && isDuplicateKeyError(error)) {
        const existing = await repository.findOne({ where: { sheetId: data.sheetId, clientRequestId: data.clientRequestId } });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async correct(id: number, updates: CorrectGoalInput, actor: Actor): Promise<Goal> {
    const reason = assertReason(actor.reason);
    const repository = await this.getRepository();
    const goal = await repository.findOne({ where: { id } });
    if (!goal) throw new GoalNotFoundError();
    if (goal.cancelledAt) throw new GoalAlreadyCancelledError();

    await assertSheetEditable(goal.sheetId, { allowSignedAmendment: true });
    const before = snapshot(goal);

    if (updates.playerId !== undefined) goal.playerId = updates.playerId;
    if (updates.minute !== undefined) goal.minute = updates.minute;
    if (updates.period !== undefined) goal.period = updates.period;
    if (updates.isOwnGoal !== undefined) goal.isOwnGoal = updates.isOwnGoal;
    if (updates.isPenalty !== undefined) goal.isPenalty = updates.isPenalty;

    const saved = await repository.save(goal);
    await this.correctionService.record({
      sheetId: saved.sheetId,
      matchId: saved.matchId,
      eventType: "GOAL",
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

  async cancel(id: number, actor: Actor): Promise<Goal> {
    const reason = assertReason(actor.reason);
    const repository = await this.getRepository();
    const goal = await repository.findOne({ where: { id } });
    if (!goal) throw new GoalNotFoundError();
    if (goal.cancelledAt) throw new GoalAlreadyCancelledError();

    await assertSheetEditable(goal.sheetId, { allowSignedAmendment: true });
    const before = snapshot(goal);
    goal.cancelledAt = new Date();
    goal.cancelledReason = reason;
    const saved = await repository.save(goal);
    await this.correctionService.record({
      sheetId: saved.sheetId,
      matchId: saved.matchId,
      eventType: "GOAL",
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
