import { getDataSource } from "@/lib/database";
import { FriendlyMatch, FriendlyMatchStatus } from "@/entities/FriendlyMatch";
import { In, Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";

/**
 * Service for FriendlyMatch operations — matchs amicaux organisés par le
 * club, en dehors du calendrier officiel (table partagée `matches`).
 */
export class FriendlyMatchService {
  private async getRepository(): Promise<Repository<FriendlyMatch>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(FriendlyMatch);
  }

  async findAll(teamId: string, categories?: "ALL" | AgeCategory[]): Promise<FriendlyMatch[]> {
    const repository = await this.getRepository();
    const where =
      categories && categories !== "ALL"
        ? categories.length === 0
          ? null
          : { teamId, category: In(categories) }
        : { teamId };
    if (!where) return [];
    return repository.find({
      where,
      relations: ["opponentTeam", "stadium"],
      order: { date: "DESC" },
    });
  }

  async findById(id: number, teamId: string): Promise<FriendlyMatch | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId }, relations: ["opponentTeam", "stadium"] });
  }

  async create(
    data: {
      category: AgeCategory;
      opponentTeamId?: string | null;
      opponentName?: string | null;
      opponentLogoUrl?: string | null;
      isHome: boolean;
      stadiumId?: number | null;
      venueName?: string | null;
      date: Date;
      notes?: string | null;
    },
    teamId: string,
    createdBy: string
  ): Promise<FriendlyMatch> {
    const repository = await this.getRepository();
    const match = repository.create({ ...data, teamId, createdBy, status: "UPCOMING" });
    return repository.save(match);
  }

  async update(
    id: number,
    teamId: string,
    data: Partial<{
      category: AgeCategory;
      opponentTeamId: string | null;
      opponentName: string | null;
      opponentLogoUrl: string | null;
      isHome: boolean;
      stadiumId: number | null;
      venueName: string | null;
      date: Date;
      notes: string | null;
    }>
  ): Promise<FriendlyMatch> {
    const repository = await this.getRepository();
    const match = await this.findById(id, teamId);
    if (!match) {
      throw new Error("Match amical non trouvé");
    }
    Object.assign(match, data);
    return repository.save(match);
  }

  async setResult(
    id: number,
    teamId: string,
    data: { status: FriendlyMatchStatus; scoreHome?: number | null; scoreAway?: number | null }
  ): Promise<FriendlyMatch> {
    const repository = await this.getRepository();
    const match = await this.findById(id, teamId);
    if (!match) {
      throw new Error("Match amical non trouvé");
    }
    match.status = data.status;
    if (data.scoreHome !== undefined) match.scoreHome = data.scoreHome;
    if (data.scoreAway !== undefined) match.scoreAway = data.scoreAway;
    return repository.save(match);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const match = await this.findById(id, teamId);
    if (!match) {
      throw new Error("Match amical non trouvé");
    }
    await repository.remove(match);
    return true;
  }
}
