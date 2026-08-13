import { getDataSource } from "@/lib/db";
import { Sheet, SheetStatus } from "@/entities/Sheet";
import { Match } from "@/entities/Match";
import { MatchReopenLog } from "@/entities/MatchReopenLog";
import { Not, Repository } from "typeorm";
import { isDuplicateKeyError } from "@/lib/dbErrors";

/**
 * TASK-P0-023 : levée quand `expectedVersion` (fourni par l'appelant) ne
 * correspond plus à `Sheet.version` en base — un autre appel a déjà modifié
 * la feuille entre la lecture côté client et cette écriture. Mappable en
 * HTTP 409 par l'appelant (voir même pattern que sheetGuard.ts).
 */
export class SheetVersionConflictError extends Error {
  constructor() {
    super("Cette feuille de match a été modifiée entre-temps : rechargez et réessayez.");
    this.name = "SheetVersionConflictError";
  }
}

/**
 * Service for Sheet operations (la feuille de match elle-même — statut,
 * horodatage des deux phases de signature).
 */
export class SheetService {
  private async getRepository(): Promise<Repository<Sheet>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Sheet);
  }

  private async getMatchRepository(): Promise<Repository<Match>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Match);
  }

  /**
   * Récupère la feuille d'un match, ou la crée si elle n'existe pas encore
   * (premier accès au match depuis l'app).
   */
  async getOrCreate(matchId: string): Promise<Sheet> {
    const repository = await this.getRepository();
    let sheet = await repository.findOne({ where: { matchId } });
    if (!sheet) {
      sheet = repository.create({ matchId, status: "DRAFT" });
      sheet = await repository.save(sheet);
    }
    return sheet;
  }

  async findById(id: number): Promise<Sheet | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id } });
  }

  /**
   * TASK-P0-023 : `expectedVersion`, quand fourni, transforme cette écriture
   * en UPDATE conditionnel (`WHERE id = :id AND version = :expectedVersion`)
   * — deux officiels transitionnant la même feuille en même temps ne
   * s'écrasent plus silencieusement : le second appel (version périmée)
   * lève SheetVersionConflictError au lieu d'écraser le résultat du
   * premier. Omis (appelants existants non encore migrés vers le
   * versioning côté UI) : l'update reste un UPDATE direct par id (toujours
   * atomique, jamais un find+save en mémoire qui pourrait écraser des
   * champs modifiés entre-temps), mais sans le contrôle de conflit.
   */
  async updateStatus(id: number, status: SheetStatus, expectedVersion?: number): Promise<Sheet> {
    const repository = await this.getRepository();

    const fields: Partial<Sheet> = { status };
    if (status === "PRE_MATCH_SIGNED") fields.preMatchSignedAt = new Date();
    if (status === "POST_MATCH_SIGNED") fields.postMatchSignedAt = new Date();
    if (status === "CLOSED") fields.closedAt = new Date();

    const qb = repository
      .createQueryBuilder()
      .update(Sheet)
      .set({ ...fields, version: () => "version + 1" })
      .where("id = :id", { id });
    if (expectedVersion !== undefined) {
      qb.andWhere("version = :expectedVersion", { expectedVersion });
    }
    const result = await qb.execute();

    if (result.affected === 0) {
      const exists = await repository.findOne({ where: { id } });
      if (!exists) {
        throw new Error("Feuille de match non trouvée");
      }
      throw new SheetVersionConflictError();
    }

    const saved = await repository.findOneOrFail({ where: { id } });
    await this.mirrorMatchStatus(saved.matchId, status);
    return saved;
  }

  /**
   * Rouvre une feuille CLOSED (TS-31, avancement.md) — appelée par
   * `POST /api/internal/matches/[matchId]/reopen`, remplace l'écriture
   * directe que `superadmin` faisait jusqu'ici dans `ms_sheets` (et
   * `matches`) depuis `reopenMatchAdmin` : matchsheet reste seul
   * propriétaire de cette transition, superadmin passe désormais par cet
   * appel HTTP authentifié (clé de service) plutôt que par TypeORM direct
   * sur une table qui ne lui appartient pas. Efface `closed_at` (feuille)
   * et `actual_finished_at` (match, plus "terminé" une fois rouvert) —
   * jamais `actual_started_at`, qui reste la trace du tout premier
   * démarrage réel du match, quel que soit le nombre de réouvertures.
   *
   * TASK-P0-023 : `expectedVersion` (optionnel) transforme la réouverture en
   * UPDATE conditionnel. La condition `status = 'CLOSED'` de l'UPDATE
   * lui-même (pas seulement le check applicatif ci-dessous) garantit qu'une
   * réouverture concurrente ne peut jamais s'exécuter deux fois : la
   * seconde échoue sur `affected = 0` plutôt que de rejouer silencieusement
   * l'effet de bord sur `matches`.
   *
   * TASK-P0-014 : `idempotencyKey` (optionnel, fourni par l'appelant — voir
   * superadmin/src/lib/matchsheetClient.ts#reopenSheet) rend l'appel
   * rejouable sans risque : un rejeu avec la même clé pour le même match
   * renvoie l'état déjà obtenu (200, sans re-vérifier CLOSED ni re-déclencher
   * le mirroring sur `matches`) au lieu d'échouer avec "feuille pas CLOSED"
   * — utile après un retry réseau côté superadmin dont la première tentative
   * avait en fait réussi côté matchsheet, seule la réponse ayant été perdue.
   */
  async reopen(
    matchId: string,
    options?: { expectedVersion?: number; idempotencyKey?: string },
  ): Promise<Sheet> {
    const repository = await this.getRepository();
    const sheet = await repository.findOne({ where: { matchId } });
    if (!sheet) {
      throw new Error("Feuille de match introuvable");
    }

    const { expectedVersion, idempotencyKey } = options ?? {};
    const dataSource = await getDataSource();

    if (idempotencyKey) {
      const existingLog = await dataSource
        .getRepository(MatchReopenLog)
        .findOne({ where: { matchId, idempotencyKey } });
      if (existingLog) {
        return sheet;
      }
    }

    if (sheet.status !== "CLOSED") {
      throw new Error(
        `Impossible de rouvrir une feuille au statut ${sheet.status} (seule une feuille CLOSED peut être rouverte)`
      );
    }
    if (expectedVersion !== undefined && sheet.version !== expectedVersion) {
      throw new SheetVersionConflictError();
    }

    const qb = repository
      .createQueryBuilder()
      .update(Sheet)
      .set({ status: "IN_PROGRESS", closedAt: null, version: () => "version + 1" })
      .where("id = :id AND status = :closed", { id: sheet.id, closed: "CLOSED" });
    if (expectedVersion !== undefined) {
      qb.andWhere("version = :expectedVersion", { expectedVersion });
    }
    const result = await qb.execute();
    if (result.affected === 0) {
      throw new SheetVersionConflictError();
    }

    const saved = await repository.findOneOrFail({ where: { id: sheet.id } });

    const matchRepository = await this.getMatchRepository();
    await matchRepository.update(
      { id: matchId, status: Not("CANCELLED") },
      { status: "IN_PROGRESS", actualFinishedAt: null }
    );

    if (idempotencyKey) {
      try {
        await dataSource.getRepository(MatchReopenLog).insert({ matchId, idempotencyKey, sheetId: sheet.id });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        // Course entre deux appels concurrents avec la même clé : la
        // réouverture elle-même reste exactly-once (garantie par l'UPDATE
        // conditionnel ci-dessus), seul l'enregistrement du journal a
        // perdu la course — rien de plus à faire.
      }
    }

    return saved;
  }

  /**
   * Répercute le statut de la feuille sur `matches.status`
   * (UPCOMING/IN_PROGRESS/FINISHED/CANCELLED) — colonne partagée déjà lue
   * par `ob` (résultats, classement) et `billetterie` (fenêtre de vente),
   * mais jusqu'ici jamais écrite par aucune app : chaque match restait
   * `UPCOMING` pour toujours, laissant la page résultats/classement d'`ob`
   * en permanence vide (voir avancement.md, rang 5). `matchsheet` est le
   * seul endroit qui sait, avec certitude, quand un match démarre et
   * finit réellement — c'est donc lui qui pilote cette transition, pas
   * une estimation basée sur la date programmée.
   */
  private async mirrorMatchStatus(matchId: string, sheetStatus: SheetStatus): Promise<void> {
    let matchStatus: Match["status"] | null = null;
    if (sheetStatus === "IN_PROGRESS") matchStatus = "IN_PROGRESS";
    if (sheetStatus === "CLOSED") matchStatus = "FINISHED";
    if (!matchStatus) return;

    const matchRepository = await this.getMatchRepository();
    // Un match CANCELLED (superadmin, voir avancement.md) ne doit jamais
    // redevenir IN_PROGRESS/FINISHED parce qu'une feuille de match progresse
    // encore côté opérateur — l'annulation n'est réversible depuis aucune app.
    const update: Partial<Match> = { status: matchStatus };
    if (matchStatus === "IN_PROGRESS") {
      // Ne jamais écraser l'heure de début initiale : actual_started_at
      // n'est fixé qu'une seule fois, au tout premier passage IN_PROGRESS
      // (une réouverture passe par reopen() ci-dessus, jamais par ici).
      const match = await matchRepository.findOne({ where: { id: matchId } });
      if (match && !match.actualStartedAt) {
        update.actualStartedAt = new Date();
      }
    }
    if (matchStatus === "FINISHED") {
      update.actualFinishedAt = new Date();
    }
    await matchRepository.update({ id: matchId, status: Not("CANCELLED") }, update);
  }
}
