import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Card, type CardType } from "@/entities/Card";
import { Player } from "@/entities/Player";
import { Suspension } from "@/entities/Suspension";
import { Fine } from "@/entities/Fine";
import { Settings } from "@/entities/Settings";
import { QueryFailedError, Repository } from "typeorm";
import { SuspensionService } from "./SuspensionService";

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
 * Un carton de ce type existe déjà pour ce joueur/match ET a déjà été
 * traité (amende générée) — voir CardService.create : jamais renvoyée pour
 * un carton saisi en live par matchsheet et pas encore traité, qui est
 * silencieusement adopté (amende + suspension ajoutées sur la ligne
 * existante) plutôt que dupliqué.
 */
export class CardAlreadyProcessedError extends Error {
  constructor() {
    super("Ce carton a déjà été enregistré et traité (amende déjà générée) pour ce joueur sur ce match.");
    this.name = "CardAlreadyProcessedError";
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
   *
   * `Card` a deux écrivains (voir db/OWNERSHIP.md, « Card a deux
   * écrivains ») : matchsheet y insère un carton pendant le live, sans
   * amende ni suspension (voir CardEventService.create côté matchsheet) —
   * à charge pour teamManager de le "retrouver" ensuite. Si un carton
   * identique (même joueur/match/type) existe déjà et n'a pas encore
   * d'amende, on l'adopte (on complète cette ligne au lieu d'en créer une
   * deuxième) : ça évite un carton en double avec double amende/suspension
   * si le club ressaisit depuis ce module ce qui a déjà été saisi en live.
   * S'il existe déjà ET a déjà une amende, on refuse (CardAlreadyProcessedError)
   * plutôt que de facturer deux fois. Une contrainte UNIQUE(playerId,
   * matchId, type) en base (voir migrations) est le filet de sécurité final
   * contre une vraie course entre deux insertions concurrentes (aucune des
   * deux apps ne partage de verrou applicatif, seule la base le peut).
   *
   * @throws DoubleYellowRequiredError si le joueur a déjà un jaune dans ce match.
   * @throws CardAlreadyProcessedError si un carton identique existe déjà et a déjà une amende.
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
    // deuxième doit être saisi comme DOUBLE_YELLOW (expulsion). S'applique
    // que le premier jaune vienne de teamManager ou de matchsheet.
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

    // Carton déjà saisi (typiquement en live par matchsheet) mais pas
    // encore traité : on l'adopte plutôt que d'en créer un deuxième.
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
        // Filet de sécurité si un carton identique a été inséré (par
        // matchsheet ou un autre onglet) entre le SELECT ci-dessus et cet
        // INSERT — voir contrainte UNIQUE(playerId, matchId, type).
        if (isDuplicateEntryError(error)) throw new CardAlreadyProcessedError();
        throw error;
      }
    }

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
