import { getDataSource } from "@/lib/database";
import { Staff } from "@/entities/Staff";
import { In, Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";

/**
 * Service for Staff operations
 * Handles all database operations for staff members (scoped to a team)
 */
export class StaffService {
  private async getRepository(): Promise<Repository<Staff>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Staff);
  }

  /**
   * Get all staff members of a team, optionnellement restreint à un
   * sous-ensemble de catégories internes (accès scopé, voir lib/access.ts).
   */
  async findAll(teamId: string, categories?: "ALL" | AgeCategory[]): Promise<Staff[]> {
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
   * Get a staff member by ID (must belong to the given team)
   */
  async findById(id: number, teamId: string): Promise<Staff | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id, teamId },
    });
  }

  /**
   * Create a new staff member
   */
  async create(
    data: {
      firstNameFr: string;
      lastNameFr: string;
      firstNameAr?: string | null;
      lastNameAr?: string | null;
      birthDate: Date;
      phone?: string | null;
      imageUrl?: string | null;
      staffType: "COACH" | "ADJOINT" | "KINE" | "MEDECIN" | "PREPARATEUR" | "ANALYSTE" | "EQUIPEMENTIER" | "COMMUNICATION" | "AUTRE";
      userId?: number | null;
      category?: AgeCategory;
    },
    teamId: string
  ): Promise<Staff> {
    const repository = await this.getRepository();

    const staff = repository.create({ ...data, category: data.category ?? "seniors", teamId });
    return repository.save(staff);
  }

  /**
   * Update a staff member
   */
  async update(
    id: number,
    teamId: string,
    data: {
      firstNameFr?: string;
      lastNameFr?: string;
      firstNameAr?: string | null;
      lastNameAr?: string | null;
      birthDate?: Date;
      phone?: string | null;
      imageUrl?: string | null;
      staffType?: "COACH" | "ADJOINT" | "KINE" | "MEDECIN" | "PREPARATEUR" | "ANALYSTE" | "EQUIPEMENTIER" | "COMMUNICATION" | "AUTRE";
      userId?: number | null;
      category?: AgeCategory;
    }
  ): Promise<Staff> {
    const repository = await this.getRepository();
    const staff = await this.findById(id, teamId);

    if (!staff) {
      throw new Error("Membre du staff non trouvé");
    }

    Object.assign(staff, data);
    return repository.save(staff);
  }

  /**
   * Delete a staff member
   */
  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const staff = await this.findById(id, teamId);

    if (!staff) {
      throw new Error("Membre du staff non trouvé");
    }

    await repository.remove(staff);
    return true;
  }
}
