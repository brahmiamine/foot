import { getDataSource } from "@/lib/database";
import { Stadium } from "@/entities/Stadium";
import { Repository } from "typeorm";

/**
 * Service for Stadium operations
 * Handles all database operations for stadiums (scoped to a team)
 */
export class StadiumService {
  private async getRepository(): Promise<Repository<Stadium>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Stadium);
  }

  /**
   * Get all stadiums of a team
   */
  async findAll(teamId: string): Promise<Stadium[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { teamId },
      order: {
        nameFr: "ASC",
      },
    });
  }

  /**
   * Get a stadium by ID (must belong to the given team)
   */
  async findById(id: number, teamId: string): Promise<Stadium | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id, teamId },
    });
  }

  /**
   * Create a new stadium
   */
  async create(
    data: {
      nameFr: string;
      nameAr?: string | null;
      addressFr?: string | null;
      addressAr?: string | null;
      cityFr?: string | null;
      cityAr?: string | null;
      isHome?: boolean;
      capacity?: number | null;
      imageUrl?: string | null;
    },
    teamId: string
  ): Promise<Stadium> {
    const repository = await this.getRepository();

    const stadium = repository.create({ ...data, teamId });
    return repository.save(stadium);
  }

  /**
   * Update a stadium
   */
  async update(
    id: number,
    teamId: string,
    data: {
      nameFr?: string;
      nameAr?: string | null;
      addressFr?: string | null;
      addressAr?: string | null;
      cityFr?: string | null;
      cityAr?: string | null;
      isHome?: boolean;
      capacity?: number | null;
      imageUrl?: string | null;
    }
  ): Promise<Stadium> {
    const repository = await this.getRepository();
    const stadium = await this.findById(id, teamId);

    if (!stadium) {
      throw new Error("Stade non trouvé");
    }

    Object.assign(stadium, data);
    return repository.save(stadium);
  }

  /**
   * Delete a stadium
   */
  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const stadium = await this.findById(id, teamId);

    if (!stadium) {
      throw new Error("Stade non trouvé");
    }

    await repository.remove(stadium);
    return true;
  }
}
