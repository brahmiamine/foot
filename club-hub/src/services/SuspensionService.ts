import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Suspension, type DisciplinaryDecision, type SuspensionStatus } from "@/entities/Suspension";
import { Card, type CardType } from "@/entities/Card";
import { Player } from "@/entities/Player";
import { Settings } from "@/entities/Settings";
import { Repository } from "typeorm";
import { sendEmail } from "@/lib/mailer";
import { LEGACY_DISCIPLINE_RULE, type DisciplineRuleValues } from "@/lib/disciplineRules";

/**
 * Logique de suspension. Les valeurs de seuil/durée sont injectées depuis le
 * snapshot du RuleSet effectivement appliqué au carton. Le paramètre reste
 * optionnel afin de préserver les appels historiques/tests : sans snapshot,
 * le comportement FTF legacy (alerte 2, suspension 3 jaunes / 1 match) reste
 * strictement identique.
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
      }</strong> (${reasonLabel}). Ne pas le convoquer / l'inscrire sur la feuille de match tant que la suspension n'est pas purgée.</p>`,
    });
  }

  private async sendAtRiskAlert(
    playerId: string,
    currentYellowCount: number,
    suspensionThreshold: number,
    suspensionMatches: number,
  ) {
    const dataSource = await getDataSource();
    const player = await dataSource.getRepository(Player).findOne({ where: { id: playerId } });
    if (!player) return;

    const settings = await dataSource.getRepository(Settings).findOne({ where: {} });
    const alertEmails = settings?.alertEmails?.split(",").map((e) => e.trim()).filter(Boolean) ?? [];
    if (alertEmails.length === 0) return;

    await sendEmail({
      to: alertEmails,
      subject: `⚠️ Risque suspension — ${player.firstNameFr} ${player.lastNameFr}`,
      html: `<p><strong>${player.firstNameFr} ${player.lastNameFr}</strong> a désormais <strong>${currentYellowCount} cartons jaunes cumulés</strong>. <strong>Le ${suspensionThreshold}e jaune déclenchera une suspension automatique de ${suspensionMatches} match${suspensionMatches > 1 ? "s" : ""}.</strong></p>`,
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
   * Évalue si un nouveau carton doit déclencher une suspension. Le snapshot
   * fourni doit être celui persisté pour ce carton par DisciplineRuleService.
   */
  async checkAndCreateSuspension(
    playerId: string,
    cardId: string,
    cardType: CardType,
    manualMatchesCount?: number,
    ruleSnapshot: DisciplineRuleValues = LEGACY_DISCIPLINE_RULE,
  ): Promise<void> {
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

      const configuredDefault = cardType === "DOUBLE_YELLOW"
        ? ruleSnapshot.defaultDoubleYellowSuspensionMatches
        : ruleSnapshot.defaultRedSuspensionMatches;
      const matchesCount = manualMatchesCount ?? configuredDefault;
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

    // ─── CARTON JAUNE — cumul paramétrable par snapshot ───────────────────
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
    const threshold = ruleSnapshot.yellowSuspensionThreshold;

    if (totalCount >= threshold) {
      const suspension = suspensionRepo.create({
        id: randomUUID(),
        playerId,
        cardId,
        reason: threshold === 3 ? "THREE_YELLOWS" : "YELLOW_ACCUMULATION",
        matchesCount: ruleSnapshot.yellowSuspensionMatches,
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

      await this.sendSuspensionAlert(
        playerId,
        `${threshold} cartons jaunes cumulés`,
        ruleSnapshot.yellowSuspensionMatches,
      );
    } else if (totalCount === ruleSnapshot.yellowWarningThreshold) {
      await this.sendAtRiskAlert(
        playerId,
        totalCount,
        threshold,
        ruleSnapshot.yellowSuspensionMatches,
      );
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
