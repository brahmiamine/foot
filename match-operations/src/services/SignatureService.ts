import { createHash } from "crypto";
import { getDataSource } from "@/lib/db";
import { Signature, SignaturePhase, ActorRole } from "@/entities/Signature";
import { Sheet } from "@/entities/Sheet";
import { Goal } from "@/entities/Goal";
import { Card } from "@/entities/Card";
import { Substitution } from "@/entities/Substitution";
import { Injury } from "@/entities/Injury";
import { Repository } from "typeorm";
import { CompetitionMatchProtocolService } from "./CompetitionMatchProtocolService";

export interface RecordedBy {
  userId: string | null;
  name: string | null;
}

/**
 * TASK-P0-024 : SHA256 (hex) d'un instantané canonique du contenu de la
 * feuille (statut + tous les événements à ce jour, triés par id pour un
 * ordre déterministe) — pas les signatures elles-mêmes (sans quoi le hash
 * dépendrait de son propre historique).
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

export class SignatureService {
  private protocolService = new CompetitionMatchProtocolService();

  private async getRepository(): Promise<Repository<Signature>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Signature);
  }

  private async requiredRolesForSheet(sheetId: number): Promise<ActorRole[]> {
    const dataSource = await getDataSource();
    const sheet = await dataSource.getRepository(Sheet).findOne({ where: { id: sheetId } });
    if (!sheet) throw new Error("Feuille de match introuvable");
    const protocol = await this.protocolService.getForMatch(sheet.matchId);
    return this.protocolService.requiredSignatureRoles(protocol);
  }

  async findBySheet(sheetId: number): Promise<Signature[]> {
    const repository = await this.getRepository();
    const all = await repository.find({ where: { sheetId }, order: { signedAt: "ASC" } });
    const latestByKey = new Map<string, Signature>();
    for (const signature of all) {
      latestByKey.set(`${signature.phase}:${signature.actorRole}`, signature);
    }
    return Array.from(latestByKey.values());
  }

  async findHistoryBySheet(sheetId: number): Promise<Signature[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { sheetId }, order: { signedAt: "ASC" } });
  }

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
   * Vrai si tous les rôles exigés par le CompetitionMatchProtocol de la
   * saison ont signé. Sans protocole spécifique, les trois rôles historiques
   * restent obligatoires, donc le comportement legacy est inchangé.
   */
  async isPhaseComplete(sheetId: number, phase: SignaturePhase): Promise<boolean> {
    const repository = await this.getRepository();
    const rows = await repository
      .createQueryBuilder("signature")
      .select("DISTINCT signature.actor_role", "actorRole")
      .where("signature.sheet_id = :sheetId AND signature.phase = :phase", { sheetId, phase })
      .getRawMany<{ actorRole: ActorRole }>();
    const present = new Set(rows.map((row) => row.actorRole));
    const required = await this.requiredRolesForSheet(sheetId);
    return required.every((role) => present.has(role));
  }

  /**
   * Vérifie seulement les signatures requises par la policy : une signature
   * optionnelle historique ne doit pas rendre la phase invalide après une
   * correction si cette policy ne l'exige plus.
   */
  async isPhaseValid(sheetId: number, matchId: string, phase: SignaturePhase): Promise<boolean> {
    const signatures = await this.findBySheet(sheetId);
    const required = await this.requiredRolesForSheet(sheetId);
    const byRole = new Map(
      signatures.filter((signature) => signature.phase === phase).map((signature) => [signature.actorRole, signature]),
    );
    if (!required.every((role) => byRole.has(role))) return false;

    const currentHash = await computeSheetContentHash(sheetId, matchId);
    return required.every((role) => byRole.get(role)?.contentHash === currentHash);
  }
}
