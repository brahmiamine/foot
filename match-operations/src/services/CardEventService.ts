import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/db";
import { Card, CardType, MatchPeriod } from "@/entities/Card";
import { Sheet } from "@/entities/Sheet";
import { QueryFailedError, Repository } from "typeorm";
import { assertSheetEditable } from "./sheetGuard";

interface CreateCardInput {
  sheetId: number;
  matchId: string;
  playerId: string;
  type: CardType;
  minute?: number | null;
  period: MatchPeriod;
  cardReasonId?: string | null;
  commentFr?: string | null;
}

export class DuplicateCardError extends Error {
  constructor(type: CardType) {
    super(`Un carton ${type} existe déjà pour ce joueur sur ce match.`);
    this.name = "DuplicateCardError";
  }
}

function isDuplicateEntryError(error: unknown): boolean {
  return error instanceof QueryFailedError && (error.driverError as { code?: string } | undefined)?.code === "ER_DUP_ENTRY";
}

export class CardEventService {
  private async getRepository(): Promise<Repository<Card>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Card);
  }

  async findByMatch(matchId: string): Promise<Card[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { matchId },
      relations: ["player", "cardReason"],
      order: { minute: "ASC" },
    });
  }

  async create(data: CreateCardInput): Promise<Card> {
    await assertSheetEditable(data.sheetId);
    const repository = await this.getRepository();

    const existing = await repository.findOne({
      where: { playerId: data.playerId, matchId: data.matchId, type: data.type },
    });
    if (existing) throw new DuplicateCardError(data.type);

    const card = repository.create({
      id: randomUUID(),
      matchId: data.matchId,
      playerId: data.playerId,
      type: data.type,
      minute: data.minute ?? null,
      period: data.period,
      cardReasonId: data.cardReasonId ?? null,
      commentFr: data.commentFr ?? null,
      createdBy: "match-operations",
      isNeutralized: false,
    });
    try {
      return await repository.save(card);
    } catch (error) {
      if (isDuplicateEntryError(error)) throw new DuplicateCardError(data.type);
      throw error;
    }
  }

  /**
   * Le vieux hard-delete reste utilisable uniquement pendant la saisie live.
   * Une fois la feuille post-match signée/clôturée, il est interdit même si
   * un amendement est ouvert car ce chemin n'écrit pas de ledger de correction.
   */
  async delete(id: string): Promise<void> {
    const dataSource = await getDataSource();
    const repository = dataSource.getRepository(Card);
    const card = await repository.findOne({ where: { id } });
    if (!card) return;
    const sheet = await dataSource.getRepository(Sheet).findOne({ where: { matchId: card.matchId } });
    if (sheet) await assertSheetEditable(sheet.id);
    await repository.delete({ id });
  }
}
