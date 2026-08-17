import { getDataSource } from "@/lib/db";
import { MatchEventCorrection, CorrectableEventType, CorrectionAction } from "@/entities/MatchEventCorrection";
import { Repository } from "typeorm";
import { SheetAmendmentService } from "./SheetAmendmentService";

export interface RecordCorrectionInput {
  sheetId: number;
  matchId: string;
  eventType: CorrectableEventType;
  eventId: number;
  action: CorrectionAction;
  before: unknown;
  after: unknown | null;
  reason: string;
  actorUserId: string | null;
  actorName: string | null;
}

/** Motif obligatoire pour toute correction/annulation (§TASK-P0-009) : jamais de suppression silencieuse. */
export class MissingCorrectionReasonError extends Error {
  constructor() {
    super("Un motif est obligatoire pour corriger ou annuler un événement de match.");
    this.name = "MissingCorrectionReasonError";
  }
}

const MIN_REASON_LENGTH = 5;

export function assertReason(reason: string | null | undefined): string {
  const trimmed = reason?.trim();
  if (!trimmed || trimmed.length < MIN_REASON_LENGTH) {
    throw new MissingCorrectionReasonError();
  }
  return trimmed;
}

/**
 * Ledger d'audit des corrections/annulations d'événements de match.
 * Lorsqu'une correction concerne une feuille déjà signée, l'amendement
 * ouvert passe à AMENDED uniquement après l'écriture du ledger : une simple
 * demande d'amendement ne prétend donc jamais qu'une modification a eu lieu.
 */
export class EventCorrectionService {
  private amendmentService = new SheetAmendmentService();

  private async getRepository(): Promise<Repository<MatchEventCorrection>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MatchEventCorrection);
  }

  async record(input: RecordCorrectionInput): Promise<MatchEventCorrection> {
    const repository = await this.getRepository();
    const entry = repository.create({
      sheetId: input.sheetId,
      matchId: input.matchId,
      eventType: input.eventType,
      eventId: input.eventId,
      action: input.action,
      beforeValue: JSON.stringify(input.before),
      afterValue: input.after === null ? null : JSON.stringify(input.after),
      reason: input.reason,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
    });
    const saved = await repository.save(entry);
    await this.amendmentService.markAmended(input.sheetId);
    return saved;
  }

  async findByMatch(matchId: string): Promise<MatchEventCorrection[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { matchId }, order: { createdAt: "ASC" } });
  }
}
