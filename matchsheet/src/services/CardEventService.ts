import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/db";
import { Card, CardType, MatchPeriod } from "@/entities/Card";
import { Player } from "@/entities/Player";
import { Repository } from "typeorm";
import { DisciplinaryService, DoubleYellowRequiredError } from "./DisciplinaryService";

export { DoubleYellowRequiredError };

interface CreateCardInput {
  matchId: string;
  playerId: string;
  type: CardType;
  minute?: number | null;
  period: MatchPeriod;
  cardReasonId?: string | null;
  commentFr?: string | null;
  /** Nombre de matchs de suspension (RED / DOUBLE_YELLOW) — défaut 1 si absent, comme teamManager. */
  suspendedMatches?: number;
}

/**
 * Service for Card operations. matchsheet écrit directement dans la table
 * `Card` partagée avec cardManager/teamManager : un carton donné pendant le
 * match reste ainsi immédiatement visible dans le module discipline du
 * club. Les effets disciplinaires (amende + suspension) sont désormais
 * déclenchés ici via `DisciplinaryService`, à l'identique de
 * `CardService.create`/`.delete` côté teamManager.
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
    const dataSource = await getDataSource();
    const repository = await this.getRepository();
    const playerRepo = dataSource.getRepository(Player);

    const player = await playerRepo.findOne({ where: { id: data.playerId } });
    if (!player) {
      throw new Error("Joueur introuvable.");
    }

    // Un joueur ne peut recevoir qu'un seul carton jaune par match — un
    // deuxième doit être saisi comme DOUBLE_YELLOW (expulsion).
    if (data.type === "YELLOW") {
      const existingYellow = await repository.findOne({
        where: { playerId: data.playerId, matchId: data.matchId, type: "YELLOW" },
      });
      if (existingYellow) throw new DoubleYellowRequiredError();
    }

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
    await repository.save(card);

    const disciplinaryService = new DisciplinaryService();
    await disciplinaryService.createFine(card, player.teamId ?? null);
    await disciplinaryService.checkAndCreateSuspension(card.playerId, card.id, card.type, data.suspendedMatches);

    return card;
  }

  async delete(id: string): Promise<void> {
    const repository = await this.getRepository();
    const card = await repository.findOne({ where: { id } });
    if (!card) return;

    // Nettoyage AVANT suppression : `repository.remove()` efface la clé
    // primaire de l'entité passée, `cleanupForDeletedCard` a besoin de
    // `card.id` pour retrouver la suspension/l'amende liées.
    const disciplinaryService = new DisciplinaryService();
    await disciplinaryService.cleanupForDeletedCard(card);

    await repository.remove(card);
  }
}
