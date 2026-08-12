import { getDataSource } from "@/lib/db";
import { Sheet, SheetStatus } from "@/entities/Sheet";
import { Match } from "@/entities/Match";
import { Not, Repository } from "typeorm";

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

  async updateStatus(id: number, status: SheetStatus): Promise<Sheet> {
    const repository = await this.getRepository();
    const sheet = await repository.findOne({ where: { id } });
    if (!sheet) {
      throw new Error("Feuille de match non trouvée");
    }
    sheet.status = status;
    if (status === "PRE_MATCH_SIGNED") sheet.preMatchSignedAt = new Date();
    if (status === "POST_MATCH_SIGNED") sheet.postMatchSignedAt = new Date();
    if (status === "CLOSED") sheet.closedAt = new Date();
    const saved = await repository.save(sheet);
    await this.mirrorMatchStatus(sheet.matchId, status);
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
   */
  async reopen(matchId: string): Promise<Sheet> {
    const repository = await this.getRepository();
    const sheet = await repository.findOne({ where: { matchId } });
    if (!sheet) {
      throw new Error("Feuille de match introuvable");
    }
    if (sheet.status !== "CLOSED") {
      throw new Error(
        `Impossible de rouvrir une feuille au statut ${sheet.status} (seule une feuille CLOSED peut être rouverte)`
      );
    }

    sheet.status = "IN_PROGRESS";
    sheet.closedAt = null;
    const saved = await repository.save(sheet);

    const matchRepository = await this.getMatchRepository();
    await matchRepository.update(
      { id: matchId, status: Not("CANCELLED") },
      { status: "IN_PROGRESS", actualFinishedAt: null }
    );

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
