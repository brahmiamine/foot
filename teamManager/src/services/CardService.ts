import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Card, type CardType } from "@/entities/Card";
import { Player } from "@/entities/Player";
import { Suspension } from "@/entities/Suspension";
import { Fine } from "@/entities/Fine";
import { Settings } from "@/entities/Settings";
import { Repository } from "typeorm";
import { SuspensionService } from "./SuspensionService";

export interface CreateCardInput {
  playerId: string;
  matchId: string;
  type: CardType;
  minute?: number | null;
  cardReasonId?: string | null;
  commentFr?: string | null;
  commentAr?: string | null;
  /** Nombre de matchs de suspension saisi manuellement (obligatoire pour RED et DOUBLE_YELLOW) */
  suspendedMatches?: number;
}

export class DoubleYellowRequiredError extends Error {
  constructor() {
    super("Ce joueur a déjà un carton jaune dans ce match. Enregistrez un DOUBLE_YELLOW (2e jaune = expulsion).");
    this.name = "DoubleYellowRequiredError";
  }
}

/**
 * Service for Card operations — port de cardManager/app/api/cards. Crée
 * automatiquement l'amende associée (règlement FTF) et déclenche
 * `SuspensionService.checkAndCreateSuspension`.
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

  /**
   * Crée un carton pour un joueur du club de l'utilisateur connecté, avec
   * l'amende associée et la vérification de suspension.
   * @throws DoubleYellowRequiredError si le joueur a déjà un jaune dans ce match.
   */
  async create(data: CreateCardInput, teamId: string, createdBy: string): Promise<Card> {
    const dataSource = await getDataSource();
    const repository = await this.getRepository();
    const playerRepo = dataSource.getRepository(Player);
    const fineRepo = dataSource.getRepository(Fine);
    const settingsRepo = dataSource.getRepository(Settings);

    const targetPlayer = await playerRepo.findOne({ where: { id: data.playerId } });
    if (!targetPlayer || targetPlayer.teamId !== teamId) {
      throw new Error("Joueur introuvable pour ce club");
    }

    // Un joueur ne peut recevoir qu'un seul carton jaune par match — un
    // deuxième doit être saisi comme DOUBLE_YELLOW (expulsion).
    if (data.type === "YELLOW") {
      const existingYellow = await repository.findOne({
        where: { playerId: data.playerId, matchId: data.matchId, type: "YELLOW" },
      });
      if (existingYellow) throw new DoubleYellowRequiredError();
    }

    const settings = await settingsRepo.findOne({ where: {} });
    const fineAmount = data.type === "YELLOW" ? (settings?.yellowFineAmount ?? "30") : (settings?.redFineAmount ?? "50");
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (settings?.fineDueDays ?? 15));

    const card = repository.create({
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
    await repository.save(card);

    const fine = fineRepo.create({
      id: randomUUID(),
      type: "CARD",
      amount: fineAmount,
      reasonFr: `Frais carton ${data.type}`,
      playerId: data.playerId,
      cardId: card.id,
      teamId,
      dueDate,
    });
    await fineRepo.save(fine);

    const suspensionService = new SuspensionService();
    await suspensionService.checkAndCreateSuspension(data.playerId, card.id, data.type, data.suspendedMatches);

    return card;
  }

  /**
   * Supprime un carton et nettoie les entités liées (suspension/amende),
   * restaure les jaunes neutralisés par un DOUBLE_YELLOW supprimé, et
   * réactive le joueur si plus aucune suspension active.
   */
  async delete(id: string, teamId: string): Promise<Card> {
    const dataSource = await getDataSource();
    const repository = await this.getRepository();
    const playerRepo = dataSource.getRepository(Player);
    const suspensionRepo = dataSource.getRepository(Suspension);
    const fineRepo = dataSource.getRepository(Fine);

    const card = await this.findById(id, teamId);
    if (!card) throw new Error("Carton non trouvé");

    // Restaurer les jaunes neutralisés par ce DOUBLE_YELLOW (même match uniquement,
    // pour ne pas restaurer des jaunes neutralisés par un autre DOUBLE_YELLOW)
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

    // Réactiver le joueur si plus de suspension active et pas d'amende OVERDUE bloquante
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
