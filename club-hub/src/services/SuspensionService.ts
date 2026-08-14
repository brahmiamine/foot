import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Suspension, type DisciplinaryDecision, type SuspensionStatus } from "@/entities/Suspension";
import { Card, type CardType } from "@/entities/Card";
import { Player } from "@/entities/Player";
import { Settings } from "@/entities/Settings";
import { Repository } from "typeorm";
import { sendEmail } from "@/lib/mailer";

/**
 * @fileoverview Logique de suspension pour la Fédération Tunisienne de
 * Football (FTF) — port direct de cardManager/lib/suspension.ts en TypeORM.
 *
 * Carton jaune — cumul de 3 avertissements (matchs différents, pas
 * nécessairement consécutifs) → 1 match de suspension auto, jaunes
 * neutralisés (compteur remis à zéro). Alerte "à risque" dès 2 jaunes
 * cumulés non-neutralisés.
 *
 * Carton rouge / double jaune — saisie manuelle du nombre de matchs par la
 * commission disciplinaire. Un DOUBLE_YELLOW neutralise aussi tous les
 * jaunes accumulés non-neutralisés du même joueur.
 */
export class SuspensionService {
  private async getRepository(): Promise<Repository<Suspension>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Suspension);
  }

  private async sendSuspensionAlert(playerId: string, reasonLabel: string, matchesCount: number) {
    const dataSource = await getDataSource();
    const player = await dataSource.getRepository(Player).findOne({ where: { id: playerId } });
    if (!player) return;

    const settings = await dataSource.getRepository(Settings).findOne({ where: {} });
    const alertEmails = settings?.alertEmails?.split(",").map((e) => e.trim()).filter(Boolean) ?? [];
    if (alertEmails.length === 0) return;

    await sendEmail({
      to: alertEmails,
      subject: `⛔ Suspension — ${player.firstNameFr} ${player.lastNameFr}`,
      html: `<p><strong>${player.firstNameFr} ${player.lastNameFr}</strong> est suspendu et <strong>ne peut pas jouer ${
        matchesCount > 1 ? `les ${matchesCount} prochains matchs` : "le prochain match"
      }</strong> (${reasonLabel} — règlement FTF). Ne pas le convoquer / l'inscrire sur la feuille de match tant que la suspension n'est pas purgée.</p>`,
    });
  }

  private async sendAtRiskAlert(playerId: string) {
    const dataSource = await getDataSource();
    const player = await dataSource.getRepository(Player).findOne({ where: { id: playerId } });
    if (!player) return;

    const settings = await dataSource.getRepository(Settings).findOne({ where: {} });
    const alertEmails = settings?.alertEmails?.split(",").map((e) => e.trim()).filter(Boolean) ?? [];
    if (alertEmails.length === 0) return;

    await sendEmail({
      to: alertEmails,
      subject: `⚠️ Risque suspension — ${player.firstNameFr} ${player.lastNameFr}`,
      html: `<p><strong>${player.firstNameFr} ${player.lastNameFr}</strong> a désormais <strong>2 cartons jaunes cumulés</strong> cette saison. <strong>Un 3e jaune lors d'un prochain match officiel déclenchera une suspension automatique d'1 match.</strong></p>`,
    });
  }

  async findAllByTeam(teamId: string): Promise<Suspension[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { teamId },
      relations: { player: true, team: true },
      order: { status: "ASC", createdAt: "DESC" },
    });
  }

  async findById(id: string, teamId: string): Promise<Suspension | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId }, relations: { player: true } });
  }

  /**
   * Évalue si un nouveau carton doit déclencher une suspension et, le cas
   * échéant, crée l'enregistrement, suspend le joueur et envoie les alertes.
   * À appeler APRÈS que le carton a été persisté en base.
   */
  async checkAndCreateSuspension(playerId: string, cardId: string, cardType: CardType, manualMatchesCount?: number): Promise<void> {
    const dataSource = await getDataSource();
    const cardRepo = dataSource.getRepository(Card);
    const playerRepo = dataSource.getRepository(Player);
    const suspensionRepo = await this.getRepository();

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
      const reason = matchesCount >= 3 ? "RED_CARD_3" : matchesCount === 2 ? "RED_CARD_2" : "RED_CARD_1";

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

      const redLabel = cardType === "DOUBLE_YELLOW" ? "double jaune (rouge indirect)" : "carton rouge";
      await this.sendSuspensionAlert(playerId, redLabel, matchesCount);
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

      await this.sendSuspensionAlert(playerId, "3 cartons jaunes cumulés", 1);
    } else if (totalCount === 2) {
      await this.sendAtRiskAlert(playerId);
    }
  }

  /**
   * Purge / annule une suspension (saisie du nombre de matchs purgés,
   * override de la commission, décision disciplinaire). Réactive le joueur
   * si plus aucune suspension active et pas d'amende OVERDUE bloquante.
   */
  async updatePurge(
    id: string,
    teamId: string,
    data: {
      matchesPurged?: number;
      status?: SuspensionStatus;
      disciplinaryDecision?: DisciplinaryDecision;
      overrideMatchesCount?: number;
    }
  ): Promise<{ before: Suspension; after: Suspension }> {
    const dataSource = await getDataSource();
    const suspensionRepo = await this.getRepository();
    const playerRepo = dataSource.getRepository(Player);
    const { FineService } = await import("./FineService");
    const fineService = new FineService();

    const current = await suspensionRepo.findOne({ where: { id, teamId }, relations: { player: true } });
    if (!current) throw new Error("Suspension non trouvée");

    const before = { ...current } as Suspension;

    const newPurged = data.matchesPurged ?? current.matchesPurged;
    const effectiveMatchesCount = data.overrideMatchesCount ?? current.overrideMatchesCount ?? current.matchesCount;
    const isPurged = newPurged >= effectiveMatchesCount;
    const isCancelledByCommission = data.disciplinaryDecision === "CANCELLED_BY_COMMISSION";

    current.matchesPurged = newPurged;
    current.status = data.status ?? (isCancelledByCommission ? "CANCELLED" : isPurged ? "PURGED" : "ACTIVE");
    if (data.disciplinaryDecision !== undefined) current.disciplinaryDecision = data.disciplinaryDecision;
    if (data.overrideMatchesCount !== undefined) current.overrideMatchesCount = data.overrideMatchesCount;

    const after = await suspensionRepo.save(current);

    // Réactivation du joueur — uniquement si amende non OVERDUE bloquante
    // (règlement FTF : PENDING ne bloque pas, seul un retard de paiement bloque)
    if (isPurged || data.status === "CANCELLED" || isCancelledByCommission) {
      const remainingActive = await suspensionRepo.count({
        where: { playerId: current.playerId, status: "ACTIVE" },
      });

      if (remainingActive === 0) {
        const overdueBlocking = await fineService.hasOverdue(current.playerId);
        if (!overdueBlocking) {
          const player = await playerRepo.findOne({ where: { id: current.playerId } });
          if (player?.status === "SUSPENDED") {
            player.status = "BLANK";
            await playerRepo.save(player);
          }
        }
      }
    }

    return { before, after };
  }
}
