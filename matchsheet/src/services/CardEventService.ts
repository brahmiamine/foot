import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/db";
import { Card, CardType, MatchPeriod } from "@/entities/Card";
import { QueryFailedError, Repository } from "typeorm";

interface CreateCardInput {
  matchId: string;
  playerId: string;
  type: CardType;
  minute?: number | null;
  period: MatchPeriod;
  cardReasonId?: string | null;
  commentFr?: string | null;
}

/**
 * Un carton du même type existe déjà pour ce joueur sur ce match —
 * physiquement impossible en vrai (un carton rouge/double jaune expulse le
 * joueur, un deuxième jaune isolé doit être saisi comme DOUBLE_YELLOW).
 * Voir CardService.create côté teamManager pour le même garde-fou et
 * db/OWNERSHIP.md, « Card a deux écrivains ».
 */
export class DuplicateCardError extends Error {
  constructor(type: CardType) {
    super(`Un carton ${type} existe déjà pour ce joueur sur ce match.`);
    this.name = "DuplicateCardError";
  }
}

/** MySQL/MariaDB : code d'erreur natif d'une violation de contrainte UNIQUE. */
function isDuplicateEntryError(error: unknown): boolean {
  return error instanceof QueryFailedError && (error.driverError as { code?: string } | undefined)?.code === "ER_DUP_ENTRY";
}

/**
 * Service for Card operations. matchsheet écrit directement dans la table
 * `Card` partagée avec cardManager/teamManager : un carton donné pendant le
 * match reste ainsi immédiatement visible dans le module discipline du
 * club. Le recalcul des suspensions/amendes reste piloté par teamManager
 * (CardService.create y applique les règles de cumul) — matchsheet se
 * contente d'enregistrer le fait, à charge pour le club de le retrouver.
 */
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

  /** @throws DuplicateCardError si un carton du même type existe déjà pour ce joueur sur ce match. */
  async create(data: CreateCardInput): Promise<Card> {
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
      createdBy: "matchsheet",
      isNeutralized: false,
    });
    try {
      return await repository.save(card);
    } catch (error) {
      // Filet de sécurité si un carton identique a été inséré (par
      // teamManager ou un autre kiosque) entre le SELECT ci-dessus et cet
      // INSERT — voir contrainte UNIQUE(playerId, matchId, type).
      if (isDuplicateEntryError(error)) throw new DuplicateCardError(data.type);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const repository = await this.getRepository();
    await repository.delete({ id });
  }
}
