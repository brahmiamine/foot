import { getDataSource } from "@/lib/database";
import { TeamMember } from "@/entities/TeamMember";
import { Repository, Not, IsNull, type FindOptionsWhere } from "typeorm";

/**
 * Service for TeamMember operations
 * Handles all database operations for team members (scoped to a team).
 * Devient la référence historique d'appartenance : `seasonId` +
 * `internalTeamId` permettent à un même joueur d'avoir plusieurs lignes
 * dans le temps (une par saison/équipe interne), jamais écrasées.
 */
export class TeamMemberService {
  private async getRepository(): Promise<Repository<TeamMember>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TeamMember);
  }

  /**
   * Get all team members of a team
   */
  async findAll(teamId: string): Promise<TeamMember[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { teamId },
      relations: ["player", "staff", "season", "internalTeam"],
      order: {
        startDate: "DESC",
        createdAt: "DESC",
      },
    });
  }

  /**
   * Get team members by type (player or staff)
   * @param isPlayer - true for players, false for staff
   */
  async findByType(isPlayer: boolean, teamId: string): Promise<TeamMember[]> {
    const repository = await this.getRepository();
    const where = isPlayer ? { teamId, playerId: Not(IsNull()) } : { teamId, staffId: Not(IsNull()) };
    return repository.find({
      where,
      relations: ["player", "staff", "season", "internalTeam"],
      order: {
        startDate: "DESC",
      },
    });
  }

  /** Historique complet d'appartenance d'un joueur (toutes saisons/équipes internes). */
  async findHistoryByPlayer(playerId: string, teamId: string): Promise<TeamMember[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { teamId, playerId },
      relations: ["season", "internalTeam"],
      order: { startDate: "DESC" },
    });
  }

  /**
   * Get a team member by ID (must belong to the given team)
   */
  async findById(id: number, teamId: string): Promise<TeamMember | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id, teamId },
      relations: ["player", "staff", "season", "internalTeam"],
    });
  }

  /**
   * Create a new team member
   */
  async create(
    data: {
      playerId?: string | null;
      staffId?: number | null;
      seasonId?: number | null;
      internalTeamId?: number | null;
      status?: "ACTIVE" | "SUSPENDED" | "ENDED";
      startDate: Date;
      endDate?: Date | null;
    },
    teamId: string
  ): Promise<TeamMember> {
    const repository = await this.getRepository();

    // Validate that exactly one of playerId or staffId is provided
    if ((data.playerId && data.staffId) || (!data.playerId && !data.staffId)) {
      throw new Error("Vous devez spécifier soit un joueur, soit un membre du staff (pas les deux, pas aucun)");
    }

    // Un même joueur/staff peut avoir plusieurs lignes dans le temps (saisons
    // différentes) : on ne bloque que le doublon ACTIF sur la même saison.
    const where: FindOptionsWhere<TeamMember> = {
      teamId,
      status: "ACTIVE",
      seasonId: data.seasonId != null ? data.seasonId : IsNull(),
    };
    if (data.playerId) {
      where.playerId = data.playerId;
    } else if (data.staffId) {
      where.staffId = data.staffId;
    }

    const existing = await repository.findOne({ where });

    if (existing) {
      const type = data.playerId ? "joueur" : "membre du staff";
      throw new Error(`Ce ${type} est déjà membre actif de l'équipe pour cette saison`);
    }

    const teamMember = repository.create({ ...data, teamId });
    return repository.save(teamMember);
  }

  /**
   * Update a team member
   */
  async update(
    id: number,
    teamId: string,
    data: {
      seasonId?: number | null;
      internalTeamId?: number | null;
      status?: "ACTIVE" | "SUSPENDED" | "ENDED";
      startDate?: Date;
      endDate?: Date | null;
    }
  ): Promise<TeamMember> {
    const repository = await this.getRepository();
    const teamMember = await this.findById(id, teamId);

    if (!teamMember) {
      throw new Error("Membre d'équipe non trouvé");
    }

    Object.assign(teamMember, data);
    return repository.save(teamMember);
  }

  /**
   * Delete a team member
   */
  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const teamMember = await this.findById(id, teamId);

    if (!teamMember) {
      throw new Error("Membre d'équipe non trouvé");
    }

    await repository.remove(teamMember);
    return true;
  }
}
