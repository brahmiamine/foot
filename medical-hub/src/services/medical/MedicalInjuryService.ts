import { In } from "typeorm";
import { Injury, type InjuryDocument, type InjurySeverity, type InjuryStatus } from "@/entities/Injury";
import { Player } from "@/entities/Player";
import { MedicalServiceBase, parseInjuryDocuments, type CategoryScope } from "./MedicalServiceBase";

export interface InjuryWithPlayer {
  injury: Injury;
  player: Player | null;
}

export class MedicalInjuryService extends MedicalServiceBase {
  protected async withPlayers(injuries: Injury[]): Promise<InjuryWithPlayer[]> {
    const ds = await this.ds();
    const playerIds = [...new Set(injuries.map((injury) => injury.playerId))];
    const players = playerIds.length
      ? await ds.getRepository(Player).find({ where: { id: In(playerIds) } })
      : [];
    const byId = new Map(players.map((player) => [player.id, player]));
    return injuries.map((injury) => ({ injury, player: byId.get(injury.playerId) ?? null }));
  }

  async rosterInCategories(teamId: string, categories: CategoryScope): Promise<Player[]> {
    const ds = await this.ds();
    const where = categories === "ALL" ? { teamId } : { teamId, category: In(categories) };
    return ds.getRepository(Player).find({ where, order: { number: "ASC" } });
  }

  async listInjuries(
    teamId: string,
    categories: CategoryScope,
    statuses?: InjuryStatus[],
  ): Promise<InjuryWithPlayer[]> {
    const ds = await this.ds();
    const roster = await this.rosterInCategories(teamId, categories);
    const rosterIds = new Set(roster.map((player) => player.id));
    const where = statuses ? { teamId, status: In(statuses) } : { teamId };
    const injuries = await ds.getRepository(Injury).find({
      where,
      order: { injuryDate: "DESC" },
    });
    const scoped =
      categories === "ALL" ? injuries : injuries.filter((injury) => rosterIds.has(injury.playerId));
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
    return repo.save(repo.create({ ...data, status: "ONGOING" }));
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
    }>,
  ): Promise<Injury | null> {
    const ds = await this.ds();
    const repo = ds.getRepository(Injury);
    const injury = await repo.findOne({ where: { id, teamId } });
    if (!injury) return null;
    Object.assign(injury, data);
    return repo.save(injury);
  }

  async appendFollowUpNote(
    id: number,
    teamId: string,
    note: string,
    authorName: string,
  ): Promise<Injury | null> {
    const ds = await this.ds();
    const repo = ds.getRepository(Injury);
    const injury = await repo.findOne({ where: { id, teamId } });
    if (!injury) return null;

    const stamp = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    const entry = `[${stamp} — ${authorName}] ${note}`;
    injury.notes = injury.notes ? `${entry}\n\n${injury.notes}` : entry;
    return repo.save(injury);
  }

  async addDocument(id: number, teamId: string, document: InjuryDocument): Promise<Injury | null> {
    const ds = await this.ds();
    const repo = ds.getRepository(Injury);
    const injury = await repo.findOne({ where: { id, teamId } });
    if (!injury) return null;
    const documents = parseInjuryDocuments(injury.documents);
    documents.push(document);
    injury.documents = JSON.stringify(documents);
    return repo.save(injury);
  }
}
