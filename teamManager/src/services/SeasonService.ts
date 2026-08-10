import { getDataSource } from "@/lib/database";
import { Season, SeasonStatus } from "@/entities/Season";
import { Repository } from "typeorm";

/**
 * Service for Season operations — saison INTERNE du club (distincte de la
 * table partagée `saisons`, fédérale). Une seule saison "courante" par
 * club à la fois (`isCurrent`), utilisée par défaut partout où une saison
 * n'est pas explicitement choisie.
 */
export class SeasonService {
  private async getRepository(): Promise<Repository<Season>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Season);
  }

  async findAll(teamId: string): Promise<Season[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId }, order: { startDate: "DESC", name: "DESC" } });
  }

  async findById(id: number, teamId: string): Promise<Season | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  async findCurrent(teamId: string): Promise<Season | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { teamId, isCurrent: true } });
  }

  /** Crée une première saison courante si le club n'en a encore aucune. */
  async ensureDefaultSeason(teamId: string): Promise<void> {
    const repository = await this.getRepository();
    const existing = await repository.count({ where: { teamId } });
    if (existing > 0) return;

    const now = new Date();
    const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const name = `${startYear}/${startYear + 1}`;

    const season = repository.create({
      teamId,
      name,
      startDate: `${startYear}-07-01`,
      endDate: `${startYear + 1}-06-30`,
      status: "ACTIVE",
      isCurrent: true,
    });
    await repository.save(season);
  }

  async create(
    data: { name: string; startDate?: string | null; endDate?: string | null; status?: SeasonStatus; isCurrent?: boolean },
    teamId: string
  ): Promise<Season> {
    const repository = await this.getRepository();

    if (data.isCurrent) {
      await repository.update({ teamId, isCurrent: true }, { isCurrent: false });
    }

    const season = repository.create({ ...data, teamId, status: data.status ?? "PLANNED", isCurrent: data.isCurrent ?? false });
    return repository.save(season);
  }

  async update(
    id: number,
    teamId: string,
    data: Partial<{ name: string; startDate: string | null; endDate: string | null; status: SeasonStatus; isCurrent: boolean }>
  ): Promise<Season> {
    const repository = await this.getRepository();
    const season = await this.findById(id, teamId);
    if (!season) {
      throw new Error("Saison non trouvée");
    }

    if (data.isCurrent) {
      await repository.update({ teamId, isCurrent: true }, { isCurrent: false });
    }

    Object.assign(season, data);
    return repository.save(season);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const season = await this.findById(id, teamId);
    if (!season) {
      throw new Error("Saison non trouvée");
    }
    await repository.remove(season);
    return true;
  }
}
