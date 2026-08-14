import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Injury, type InjuryDocument, type InjurySeverity, type InjuryStatus } from "@/entities/Injury";
import { Player } from "@/entities/Player";
import type { AgeCategory } from "@/types/categories";

export type CategoryScope = "ALL" | AgeCategory[];

export interface InjuryWithPlayer {
  injury: Injury;
  player: Player | null;
}

export interface AlertEntry {
  injury: Injury;
  player: Player | null;
  kind: "OVERDUE" | "RETURN_SOON";
  daysDiff: number;
}

function parseDocuments(injury: Injury): InjuryDocument[] {
  if (!injury.documents) return [];
  try {
    const parsed = JSON.parse(injury.documents);
    return Array.isArray(parsed) ? parsed.filter((d): d is InjuryDocument => typeof d?.name === "string" && typeof d?.url === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Logique métier "vue médicale" de medical-hub, au-dessus de `cms_injuries`
 * (possédée par club-hub). Chaque méthode d'écriture suppose que
 * l'appelant (Server Action) a déjà vérifié la permission
 * "medical.manage" — ce service ne revérifie pas le RBAC lui-même (même
 * convention que StaffPortalService).
 */
export class MedicalPortalService {
  private async ds() {
    return getDataSource();
  }

  private async withPlayers(injuries: Injury[]): Promise<InjuryWithPlayer[]> {
    const ds = await this.ds();
    const playerIds = [...new Set(injuries.map((i) => i.playerId))];
    const players = playerIds.length ? await ds.getRepository(Player).find({ where: { id: In(playerIds) } }) : [];
    const byId = new Map(players.map((p) => [p.id, p]));
    return injuries.map((injury) => ({ injury, player: byId.get(injury.playerId) ?? null }));
  }

  async rosterInCategories(teamId: string, categories: CategoryScope): Promise<Player[]> {
    const ds = await this.ds();
    const where = categories === "ALL" ? { teamId } : { teamId, category: In(categories) };
    return ds.getRepository(Player).find({ where, order: { number: "ASC" } });
  }

  async listInjuries(teamId: string, categories: CategoryScope, statuses?: InjuryStatus[]): Promise<InjuryWithPlayer[]> {
    const ds = await this.ds();
    const roster = await this.rosterInCategories(teamId, categories);
    const rosterIds = new Set(roster.map((p) => p.id));

    const where = statuses ? { teamId, status: In(statuses) } : { teamId };
    const injuries = await ds.getRepository(Injury).find({ where, order: { injuryDate: "DESC" } });
    const scoped = categories === "ALL" ? injuries : injuries.filter((i) => rosterIds.has(i.playerId));
    return this.withPlayers(scoped);
  }

  async getInjury(id: number, teamId: string): Promise<Injury | null> {
    const ds = await this.ds();
    return ds.getRepository(Injury).findOne({ where: { id, teamId } });
  }

  async createInjury(data: {
    teamId: string;
    playerId: string;
    injuryDate: string;
    zone: string;
    severity: InjurySeverity;
    description?: string;
    diagnosis?: string;
    unavailabilityDays?: number;
    expectedReturnDate?: string;
    progressiveReturn?: boolean;
    progressiveReturnNotes?: string;
    createdBy: string;
  }): Promise<Injury> {
    const ds = await this.ds();
    const repo = ds.getRepository(Injury);
    const injury = repo.create({ ...data, status: "ONGOING" });
    return repo.save(injury);
  }

  async updateInjury(
    id: number,
    teamId: string,
    data: Partial<{
      zone: string;
      severity: InjurySeverity;
      description: string | null;
      diagnosis: string | null;
      unavailabilityDays: number | null;
      expectedReturnDate: string | null;
      actualReturnDate: string | null;
      progressiveReturn: boolean;
      progressiveReturnNotes: string | null;
      status: InjuryStatus;
    }>
  ): Promise<Injury | null> {
    const ds = await this.ds();
    const repo = ds.getRepository(Injury);
    const injury = await repo.findOne({ where: { id, teamId } });
    if (!injury) return null;
    Object.assign(injury, data);
    return repo.save(injury);
  }

  /**
   * Journal de suivi quotidien : pas de table dédiée (schéma additif
   * minimal côté medical-hub, voir README) — chaque entrée est préfixée
   * d'une date et ajoutée en tête du champ `notes` existant, jamais
   * écrasée.
   */
  async appendFollowUpNote(id: number, teamId: string, note: string, authorName: string): Promise<Injury | null> {
    const ds = await this.ds();
    const repo = ds.getRepository(Injury);
    const injury = await repo.findOne({ where: { id, teamId } });
    if (!injury) return null;

    const stamp = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date());
    const entry = `[${stamp} — ${authorName}] ${note}`;
    injury.notes = injury.notes ? `${entry}\n\n${injury.notes}` : entry;
    return repo.save(injury);
  }

  async addDocument(id: number, teamId: string, document: InjuryDocument): Promise<Injury | null> {
    const ds = await this.ds();
    const repo = ds.getRepository(Injury);
    const injury = await repo.findOne({ where: { id, teamId } });
    if (!injury) return null;
    const documents = parseDocuments(injury);
    documents.push(document);
    injury.documents = JSON.stringify(documents);
    return repo.save(injury);
  }

  async getDocuments(teamId: string, categories: CategoryScope): Promise<Array<{ injury: Injury; player: Player | null; document: InjuryDocument }>> {
    const withPlayers = await this.listInjuries(teamId, categories);
    const rows: Array<{ injury: Injury; player: Player | null; document: InjuryDocument }> = [];
    for (const { injury, player } of withPlayers) {
      for (const document of parseDocuments(injury)) {
        rows.push({ injury, player, document });
      }
    }
    return rows;
  }

  async getUnavailablePlayers(teamId: string, categories: CategoryScope): Promise<InjuryWithPlayer[]> {
    return this.listInjuries(teamId, categories, ["ONGOING", "RECOVERING"]);
  }

  async getAlerts(teamId: string, categories: CategoryScope): Promise<AlertEntry[]> {
    const active = await this.listInjuries(teamId, categories, ["ONGOING", "RECOVERING"]);
    const now = Date.now();
    const alerts: AlertEntry[] = [];

    for (const { injury, player } of active) {
      if (!injury.expectedReturnDate) continue;
      const expected = new Date(injury.expectedReturnDate).getTime();
      const daysDiff = Math.round((expected - now) / (24 * 60 * 60 * 1000));
      if (daysDiff < 0) {
        alerts.push({ injury, player, kind: "OVERDUE", daysDiff });
      } else if (daysDiff <= 3) {
        alerts.push({ injury, player, kind: "RETURN_SOON", daysDiff });
      }
    }

    return alerts.sort((a, b) => a.daysDiff - b.daysDiff);
  }

  async getAvailabilitySummary(
    teamId: string,
    categories: CategoryScope
  ): Promise<{ totalPlayers: number; available: number; ongoing: number; recovering: number }> {
    const roster = await this.rosterInCategories(teamId, categories);
    const unavailable = await this.getUnavailablePlayers(teamId, categories);
    const ongoing = unavailable.filter(({ injury }) => injury.status === "ONGOING").length;
    const recovering = unavailable.filter(({ injury }) => injury.status === "RECOVERING").length;
    return { totalPlayers: roster.length, available: roster.length - unavailable.length, ongoing, recovering };
  }
}

export const medicalPortalService = new MedicalPortalService();
