import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Card, type CardType } from "@/entities/Card";
import { Player } from "@/entities/Player";
import { Suspension } from "@/entities/Suspension";
import { Fine } from "@/entities/Fine";
import { QueryFailedError, Repository } from "typeorm";
import { SuspensionService } from "./SuspensionService";
import { DisciplineRuleService } from "./DisciplineRuleService";

/** MySQL/MariaDB : code d'erreur natif d'une violation de contrainte UNIQUE. */
function isDuplicateEntryError(error: unknown): boolean {
  return error instanceof QueryFailedError && (error.driverError as { code?: string } | undefined)?.code === "ER_DUP_ENTRY";
}

export interface CreateCardInput {
  playerId: string;
  matchId: string;
  type: CardType;
  minute?: number | null;
  cardReasonId?: string | null;
  commentFr?: string | null;
  commentAr?: string | null;
  /** Nombre de matchs de suspension saisi manuellement pour RED/DOUBLE_YELLOW. */
  suspendedMatches?: number;
}

export class DoubleYellowRequiredError extends Error {
  constructor() {
    super("Ce joueur a déjà un carton jaune dans ce match. Enregistrez un DOUBLE_YELLOW (2e jaune = expulsion).");
    this.name = "DoubleYellowRequiredError";
  }
}

export class CardAlreadyProcessedError extends Error {
  constructor() {
    super("Ce carton a déjà été enregistré et traité (amende déjà générée) pour ce joueur sur ce match.");
    this.name = "CardAlreadyProcessedError";
  }
}

/**
 * Service des cartons. Chaque traitement club-hub capture désormais une
 * DisciplineRuleApplication immutable avant de calculer l'amende et la
 * suspension. Une évolution future du règlement ne modifie donc jamais une
 * sanction déjà calculée.
 */
export class CardService {
  private async getRepository(): Promise<Repository<Card>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Card);
  }

  async findAllByTeam(teamId: string): Promise<Card[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { player: { teamId } },
      relations: { player: true, match: { matchday: true, homeTeam: true, awayTeam: true } },
      order: { createdAt: "DESC" },
      take: 100,
    });
  }

  async findById(id: string, teamId: string): Promise<Card | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, player: { teamId } }, relations: { player: true } });
  }

  async create(data: CreateCardInput, teamId: string, createdBy: string): Promise<Card> {
    const dataSource = await getDataSource();
    const repository = await this.getRepository();
    const playerRepo = dataSource.getRepository(Player);
    const fineRepo = dataSource.getRepository(Fine);

    const targetPlayer = await playerRepo.findOne({ where: { id: data.playerId } });
    if (!targetPlayer || targetPlayer.teamId !== teamId) {
      throw new Error("Joueur introuvable pour ce club");
    }

    if (data.type === "YELLOW") {
      const existingYellow = await repository.findOne({
        where: { playerId: data.playerId, matchId: data.matchId, type: "YELLOW" },
      });
      if (existingYellow) throw new DoubleYellowRequiredError();
    }

    const existing = await repository.findOne({
      where: { playerId: data.playerId, matchId: data.matchId, type: data.type },
    });
    let card: Card;
    if (existing) {
      const alreadyFined = await fineRepo.count({ where: { cardId: existing.id } });
      if (alreadyFined > 0) throw new CardAlreadyProcessedError();

      existing.minute = data.minute ?? existing.minute;
      existing.cardReasonId = data.cardReasonId ?? existing.cardReasonId;
      existing.commentFr = data.commentFr ?? existing.commentFr;
      existing.commentAr = data.commentAr ?? existing.commentAr;
      card = await repository.save(existing);
    } else {
      card = repository.create({
        id: randomUUID(),
        playerId: data.playerId,
        matchId: data.matchId,
        type: data.type,
        minute: data.minute ?? null,
        cardReasonId: data.cardReasonId ?? null,
        commentFr: data.commentFr ?? null,
        commentAr: data.commentAr ?? null,
        createdBy,
        isNeutralized: false,
      });
      try {
        await repository.save(card);
      } catch (error) {
        if (isDuplicateEntryError(error)) throw new CardAlreadyProcessedError();
        throw error;
      }
    }

    const { resolved } = await new DisciplineRuleService().resolveAndSnapshotForCard(
      teamId,
      data.matchId,
      data.playerId,
      card.id,
      createdBy,
    );
    const fineAmount = data.type === "YELLOW" ? resolved.yellowFineAmount : resolved.redFineAmount;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + resolved.fineDueDays);

    const fine = fineRepo.create({
      id: randomUUID(),
      type: "CARD",
      amount: fineAmount.toFixed(3),
      reasonFr: `Frais carton ${data.type}`,
      playerId: data.playerId,
      cardId: card.id,
      teamId,
      dueDate,
    });
    await fineRepo.save(fine);

    await new SuspensionService().checkAndCreateSuspension(
      data.playerId,
      card.id,
      data.type,
      data.suspendedMatches,
      resolved,
    );

    return card;
  }

  /**
   * Supprime un carton et ses dérivés opérationnels. Le snapshot de règle
   * reste volontairement en base comme preuve d'audit de la sanction qui a
   * été calculée avant suppression du carton.
   */
  async delete(id: string, teamId: string): Promise<Card> {
    const dataSource = await getDataSource();
    const repository = await this.getRepository();
    const playerRepo = dataSource.getRepository(Player);
    const suspensionRepo = dataSource.getRepository(Suspension);
    const fineRepo = dataSource.getRepository(Fine);

    const card = await this.findById(id, teamId);
    if (!card) throw new Error("Carton non trouvé");

    if (card.type === "DOUBLE_YELLOW") {
      await repository
        .createQueryBuilder()
        .update(Card)
        .set({ isNeutralized: false })
        .where("playerId = :playerId", { playerId: card.playerId })
        .andWhere("matchId = :matchId", { matchId: card.matchId })
        .andWhere("type = 'YELLOW'")
        .andWhere("isNeutralized = true")
        .execute();
    }

    await suspensionRepo.delete({ cardId: id });
    await fineRepo.delete({ cardId: id });
    await repository.remove(card);

    const remainingActive = await suspensionRepo.count({ where: { playerId: card.playerId, status: "ACTIVE" } });
    if (remainingActive === 0) {
      const player = await playerRepo.findOne({ where: { id: card.playerId } });
      if (player?.status === "SUSPENDED") {
        const overdueBlocking = await fineRepo.count({ where: { playerId: card.playerId, status: "OVERDUE" } });
        if (overdueBlocking === 0) {
          player.status = "BLANK";
          await playerRepo.save(player);
        }
      }
    }

    return card;
  }
}
