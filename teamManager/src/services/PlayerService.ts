import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { Player, type PlayerStatus } from "@/entities/Player";
import { In, Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";

/**
 * Service for Player operations
 * Handles all database operations for players (scoped to a team). La table
 * `Player` est partagée avec cardManager (système disciplinaire) : les cartons/
 * suspensions/amendes/notes s'appuient sur les mêmes lignes.
 */
export class PlayerService {
  private async getRepository(): Promise<Repository<Player>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Player);
  }

  /**
   * Get all players of a team, optionally restreint à un sous-ensemble de
   * catégories internes (accès scopé d'un coach, voir lib/access.ts).
   * `categories: "ALL"` (ou omis) ne filtre pas.
   */
  async findAll(teamId: string, categories?: "ALL" | AgeCategory[]): Promise<Player[]> {
    const repository = await this.getRepository();
    if (categories && categories !== "ALL") {
      if (categories.length === 0) return [];
      return repository.find({
        where: { teamId, category: In(categories) },
        order: { lastNameFr: "ASC", firstNameFr: "ASC" },
      });
    }
    return repository.find({
      where: { teamId },
      order: {
        lastNameFr: "ASC",
        firstNameFr: "ASC",
      },
    });
  }

  /**
   * Get a player by ID (must belong to the given team)
   */
  async findById(id: string, teamId: string): Promise<Player | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id, teamId },
    });
  }

  /**
   * Create a new player
   */
  async create(
    data: {
      firstNameFr: string;
      lastNameFr: string;
      firstNameAr?: string | null;
      lastNameAr?: string | null;
      number: number;
      status?: PlayerStatus;
      birthDate?: Date | null;
      position?: string | null;
      imageUrl?: string | null;
      category?: AgeCategory;
    },
    teamId: string
  ): Promise<Player> {
    const repository = await this.getRepository();

    const player = repository.create({
      id: randomUUID(),
      ...data,
      status: data.status ?? "TITULAR",
      category: data.category ?? "seniors",
      isActive: true,
      teamId,
    });
    return repository.save(player);
  }

  /**
   * Update a player
   */
  async update(
    id: string,
    teamId: string,
    data: {
      firstNameFr?: string;
      lastNameFr?: string;
      firstNameAr?: string | null;
      lastNameAr?: string | null;
      number?: number;
      status?: PlayerStatus;
      isActive?: boolean;
      birthDate?: Date | null;
      position?: string | null;
      imageUrl?: string | null;
      category?: AgeCategory;
    }
  ): Promise<Player> {
    const repository = await this.getRepository();
    const player = await this.findById(id, teamId);

    if (!player) {
      throw new Error("Joueur non trouvé");
    }

    Object.assign(player, data);
    return repository.save(player);
  }

  /**
   * Delete a player
   */
  async delete(id: string, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const player = await this.findById(id, teamId);

    if (!player) {
      throw new Error("Joueur non trouvé");
    }

    await repository.remove(player);
    return true;
  }
}
