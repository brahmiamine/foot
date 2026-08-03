import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/db";
import { Card, CardType, MatchPeriod } from "@/entities/Card";
import { Repository } from "typeorm";

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

  async create(data: CreateCardInput): Promise<Card> {
    const repository = await this.getRepository();
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
    return repository.save(card);
  }

  async delete(id: string): Promise<void> {
    const repository = await this.getRepository();
    await repository.delete({ id });
  }
}
