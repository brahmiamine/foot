import { createHash } from "crypto";
import { getDataSource } from "@/lib/db";
import { Signature, SignaturePhase, ActorRole } from "@/entities/Signature";
import { Sheet } from "@/entities/Sheet";
import { Goal } from "@/entities/Goal";
import { Card } from "@/entities/Card";
import { Substitution } from "@/entities/Substitution";
import { Injury } from "@/entities/Injury";
import { Repository } from "typeorm";

export interface RecordedBy {
  userId: string | null;
  name: string | null;
}

/**
 * TASK-P0-024 : SHA256 (hex) d'un instantané canonique du contenu de la
 * feuille (statut + tous les événements à ce jour, triés par id pour un
 * ordre déterministe) — pas les signatures elles-mêmes (sans quoi le hash
 * dépendrait de son propre historique). Recalculer ce hash plus tard et le
 * comparer à celui stocké sur une signature révèle si le contenu de la
 * feuille a changé depuis cette signature (événement ajouté/modifié après
 * coup).
 */
export async function computeSheetContentHash(sheetId: number, matchId: string): Promise<string> {
  const dataSource = await getDataSource();

  const [sheet, goals, cards, substitutions, injuries] = await Promise.all([
    dataSource.getRepository(Sheet).findOne({ where: { id: sheetId } }),
    dataSource.getRepository(Goal).find({ where: { sheetId }, order: { id: "ASC" } }),
    dataSource.getRepository(Card).find({ where: { matchId }, order: { id: "ASC" } }),
    dataSource.getRepository(Substitution).find({ where: { sheetId }, order: { id: "ASC" } }),
    dataSource.getRepository(Injury).find({ where: { sheetId }, order: { id: "ASC" } }),
  ]);

  const snapshot = {
    sheetStatus: sheet?.status ?? null,
    goals: goals.map((g) => ({ id: g.id, playerId: g.playerId, teamId: g.teamId, minute: g.minute, period: g.period, isOwnGoal: g.isOwnGoal, isPenalty: g.isPenalty })),
    cards: cards.map((c) => ({ id: c.id, playerId: c.playerId, type: c.type, minute: c.minute, period: c.period, isNeutralized: c.isNeutralized })),
    substitutions: substitutions.map((s) => ({ id: s.id, playerOutId: s.playerOutId, playerInId: s.playerInId, minute: s.minute, period: s.period })),
    injuries: injuries.map((i) => ({ id: i.id, playerId: i.playerId, minute: i.minute, period: i.period, requiresSubstitution: i.requiresSubstitution })),
  };

  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

/**
 * Service for Signature operations (signature dessinée par l'un des trois
 * acteurs — équipe domicile, équipe extérieure, arbitre — pour chaque phase).
 */
export class SignatureService {
  private async getRepository(): Promise<Repository<Signature>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Signature);
  }

  /**
   * TASK-P0-024 : renvoie la signature la PLUS RÉCENTE par (phase,
   * actorRole) — save() est append-only (voir plus bas), il peut donc
   * exister plusieurs lignes historiques pour le même acteur/phase.
   */
  async findBySheet(sheetId: number): Promise<Signature[]> {
    const repository = await this.getRepository();
    const all = await repository.find({ where: { sheetId }, order: { signedAt: "ASC" } });
    const latestByKey = new Map<string, Signature>();
    for (const signature of all) {
      latestByKey.set(`${signature.phase}:${signature.actorRole}`, signature);
    }
    return Array.from(latestByKey.values());
  }

  /** Historique complet (toutes les re-signatures), pour audit. */
  async findHistoryBySheet(sheetId: number): Promise<Signature[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { sheetId }, order: { signedAt: "ASC" } });
  }

  /**
   * Enregistre la signature d'un acteur pour une phase donnée.
   *
   * TASK-P0-024 : append-only — une re-signature (ex: correction d'une
   * erreur) insère une NOUVELLE ligne plutôt que d'écraser l'ancienne, pour
   * conserver un historique complet (voir avancement.md, exigence
   * "Audit: historique signatures append-only"). Chaque ligne porte
   * l'identité SSO de l'opérateur l'ayant enregistrée (traçabilité, pas
   * preuve cryptographique du signataire physique — voir Signature.ts) et
   * un hash du contenu de la feuille à cet instant.
   */
  async save(
    sheetId: number,
    matchId: string,
    phase: SignaturePhase,
    actorRole: ActorRole,
    data: { signerName?: string | null; signatureData: string },
    recordedBy: RecordedBy,
  ): Promise<Signature> {
    const repository = await this.getRepository();
    const contentHash = await computeSheetContentHash(sheetId, matchId);

    const signature = repository.create({
      sheetId,
      phase,
      actorRole,
      signerName: data.signerName ?? null,
      signatureData: data.signatureData,
      recordedByUserId: recordedBy.userId,
      recordedByName: recordedBy.name,
      contentHash,
    });
    return repository.save(signature);
  }

  /**
   * Vrai si les 3 acteurs (domicile, extérieur, arbitre) ont signé pour
   * cette phase. Compte les RÔLES distincts (pas les lignes) : depuis que
   * save() est append-only, une re-signature ne doit pas fausser ce
   * calcul.
   */
  async isPhaseComplete(sheetId: number, phase: SignaturePhase): Promise<boolean> {
    const repository = await this.getRepository();
    const rows = await repository
      .createQueryBuilder("signature")
      .select("DISTINCT signature.actor_role", "actorRole")
      .where("signature.sheet_id = :sheetId AND signature.phase = :phase", { sheetId, phase })
      .getRawMany<{ actorRole: string }>();
    return rows.length >= 3;
  }
}
