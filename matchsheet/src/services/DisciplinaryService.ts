import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/db";
import { Card, CardType } from "@/entities/Card";
import { Player } from "@/entities/Player";
import { Fine } from "@/entities/Fine";
import { Suspension, SuspensionReason } from "@/entities/Suspension";
import { Settings } from "@/entities/Settings";

export class DoubleYellowRequiredError extends Error {
  constructor() {
    super("Ce joueur a déjà un carton jaune dans ce match. Enregistrez un « 2e jaune » (double jaune = expulsion).");
    this.name = "DoubleYellowRequiredError";
  }
}

/**
 * Port des effets disciplinaires de teamManager (`CardService.create` +
 * `SuspensionService.checkAndCreateSuspension` + le nettoyage de
 * `CardService.delete`) pour que les cartons saisis en direct depuis
 * matchsheet déclenchent les mêmes amendes/suspensions que ceux saisis
 * depuis l'admin teamManager — mêmes tables partagées `Fine`/`Suspension`.
 *
 * Différence volontaire : pas d'envoi d'e-mail d'alerte ici (mailer/SMTP
 * propre à teamManager, non dupliqué dans ce kiosque).
 */
export class DisciplinaryService {
  /** Amende (règlement FTF) dérivée du carton, sur l'équipe du joueur. */
  async createFine(card: Card, teamId: string | null): Promise<Fine> {
    const dataSource = await getDataSource();
    const fineRepo = dataSource.getRepository(Fine);
    const settingsRepo = dataSource.getRepository(Settings);

    const settings = await settingsRepo.findOne({ where: {} });
    const fineAmount = card.type === "YELLOW" ? (settings?.yellowFineAmount ?? "30") : (settings?.redFineAmount ?? "50");
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (settings?.fineDueDays ?? 15));

    const fine = fineRepo.create({
      id: randomUUID(),
      type: "CARD",
      amount: fineAmount,
      reasonFr: `Frais carton ${card.type}`,
      playerId: card.playerId,
      cardId: card.id,
      teamId,
      dueDate,
    });
    return fineRepo.save(fine);
  }

  /**
   * Évalue si ce carton déclenche une suspension (cumul de 3 jaunes non
   * neutralisés, ou rouge/double jaune) et, le cas échéant, crée
   * l'enregistrement et suspend le joueur. À appeler APRÈS que le carton a
   * été persisté en base.
   */
  async checkAndCreateSuspension(playerId: string, cardId: string, cardType: CardType, manualMatchesCount?: number): Promise<void> {
    const dataSource = await getDataSource();
    const cardRepo = dataSource.getRepository(Card);
    const playerRepo = dataSource.getRepository(Player);
    const suspensionRepo = dataSource.getRepository(Suspension);

    const player = await playerRepo.findOne({ where: { id: playerId } });

    // ─── CARTON ROUGE / DOUBLE JAUNE ─────────────────────────────────────
    if (cardType === "RED" || cardType === "DOUBLE_YELLOW") {
      if (cardType === "DOUBLE_YELLOW") {
        const unlinkedYellows = await cardRepo
          .createQueryBuilder("card")
          .leftJoin(Suspension, "suspension", "suspension.cardId = card.id")
          .where("card.playerId = :playerId", { playerId })
          .andWhere("card.type = 'YELLOW'")
          .andWhere("card.isNeutralized = false")
          .andWhere("suspension.id IS NULL")
          .select("card.id", "id")
          .getRawMany<{ id: string }>();

        if (unlinkedYellows.length > 0) {
          await cardRepo
            .createQueryBuilder()
            .update(Card)
            .set({ isNeutralized: true })
            .whereInIds(unlinkedYellows.map((c) => c.id))
            .execute();
        }
      }

      const matchesCount = manualMatchesCount ?? 1;
      const reason: SuspensionReason = matchesCount >= 3 ? "RED_CARD_3" : matchesCount === 2 ? "RED_CARD_2" : "RED_CARD_1";

      const suspension = suspensionRepo.create({
        id: randomUUID(),
        playerId,
        cardId,
        reason,
        matchesCount,
        teamId: player?.teamId ?? null,
        status: "ACTIVE",
      });
      await suspensionRepo.save(suspension);

      if (player) {
        player.status = "SUSPENDED";
        await playerRepo.save(player);
      }
      return;
    }

    // ─── CARTON JAUNE — règle du cumul (3 jaunes en 3 matchs différents) ──
    const priorYellows = await cardRepo
      .createQueryBuilder("card")
      .leftJoin(Suspension, "suspension", "suspension.cardId = card.id")
      .where("card.playerId = :playerId", { playerId })
      .andWhere("card.type = 'YELLOW'")
      .andWhere("card.isNeutralized = false")
      .andWhere("card.id != :cardId", { cardId })
      .andWhere("suspension.id IS NULL")
      .select("card.id", "id")
      .getRawMany<{ id: string }>();

    const totalCount = priorYellows.length + 1;

    if (totalCount >= 3) {
      const suspension = suspensionRepo.create({
        id: randomUUID(),
        playerId,
        cardId,
        reason: "THREE_YELLOWS",
        matchesCount: 1,
        teamId: player?.teamId ?? null,
        status: "ACTIVE",
      });
      await suspensionRepo.save(suspension);

      if (player) {
        player.status = "SUSPENDED";
        await playerRepo.save(player);
      }

      if (priorYellows.length > 0) {
        await cardRepo
          .createQueryBuilder()
          .update(Card)
          .set({ isNeutralized: true })
          .whereInIds(priorYellows.map((c) => c.id))
          .execute();
      }
    }
  }

  /**
   * Nettoyage à la suppression d'un carton (le carton lui-même est déjà
   * retiré par l'appelant) : restaure les jaunes neutralisés par un
   * DOUBLE_YELLOW supprimé, supprime la suspension/l'amende liées, et
   * réactive le joueur si plus aucune suspension active ne le bloque.
   */
  async cleanupForDeletedCard(card: Card): Promise<void> {
    const dataSource = await getDataSource();
    const cardRepo = dataSource.getRepository(Card);
    const playerRepo = dataSource.getRepository(Player);
    const suspensionRepo = dataSource.getRepository(Suspension);
    const fineRepo = dataSource.getRepository(Fine);

    if (card.type === "DOUBLE_YELLOW") {
      await cardRepo
        .createQueryBuilder()
        .update(Card)
        .set({ isNeutralized: false })
        .where("playerId = :playerId", { playerId: card.playerId })
        .andWhere("matchId = :matchId", { matchId: card.matchId })
        .andWhere("type = 'YELLOW'")
        .andWhere("isNeutralized = true")
        .execute();
    }

    await suspensionRepo.delete({ cardId: card.id });
    await fineRepo.delete({ cardId: card.id });

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
  }
}
