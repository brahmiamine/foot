import { getDataSource } from "@/lib/database";
import { Guardian } from "@/entities/Guardian";
import { PlayerGuardian } from "@/entities/PlayerGuardian";
import { Repository } from "typeorm";

/** Service for Guardian operations — parents / responsables légaux des joueurs. */
export class GuardianService {
  private async getRepository(): Promise<Repository<Guardian>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Guardian);
  }

  private async getLinkRepository(): Promise<Repository<PlayerGuardian>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(PlayerGuardian);
  }

  async findAll(teamId: string): Promise<Guardian[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId }, order: { lastName: "ASC", firstName: "ASC" } });
  }

  async findById(id: number, teamId: string): Promise<Guardian | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  async findLinksByGuardian(guardianId: number): Promise<PlayerGuardian[]> {
    const repository = await this.getLinkRepository();
    return repository.find({ where: { guardianId }, relations: ["player"] });
  }

  async findLinksByTeam(guardianIds: number[]): Promise<PlayerGuardian[]> {
    if (guardianIds.length === 0) return [];
    const dataSource = await getDataSource();
    return dataSource
      .getRepository(PlayerGuardian)
      .createQueryBuilder("link")
      .leftJoinAndSelect("link.player", "player")
      .where("link.guardianId IN (:...guardianIds)", { guardianIds })
      .getMany();
  }

  /** Parents/tuteurs d'un joueur donné (pour l'afficher sur sa fiche / la communication). */
  async findGuardiansForPlayer(playerId: string): Promise<PlayerGuardian[]> {
    const repository = await this.getLinkRepository();
    return repository.find({ where: { playerId }, relations: ["guardian"] });
  }

  async create(data: { firstName: string; lastName: string; phone?: string | null; email?: string | null; address?: string | null }, teamId: string): Promise<Guardian> {
    const repository = await this.getRepository();
    const guardian = repository.create({ ...data, teamId });
    return repository.save(guardian);
  }

  async update(
    id: number,
    teamId: string,
    data: Partial<{ firstName: string; lastName: string; phone: string | null; email: string | null; address: string | null }>
  ): Promise<Guardian> {
    const repository = await this.getRepository();
    const guardian = await this.findById(id, teamId);
    if (!guardian) {
      throw new Error("Parent/tuteur non trouvé");
    }
    Object.assign(guardian, data);
    return repository.save(guardian);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const guardian = await this.findById(id, teamId);
    if (!guardian) {
      throw new Error("Parent/tuteur non trouvé");
    }
    await repository.remove(guardian);
    return true;
  }

  async linkPlayer(
    guardianId: number,
    data: { playerId: string; relationship?: string | null; isPrimary?: boolean; hasCustody?: boolean; receivesNotifications?: boolean; receivesDocuments?: boolean }
  ): Promise<PlayerGuardian> {
    const repository = await this.getLinkRepository();
    const existing = await repository.findOne({ where: { guardianId, playerId: data.playerId } });
    if (existing) {
      throw new Error("Ce joueur est déjà lié à ce parent/tuteur");
    }
    const link = repository.create({
      guardianId,
      playerId: data.playerId,
      relationship: data.relationship ?? null,
      isPrimary: data.isPrimary ?? false,
      hasCustody: data.hasCustody ?? true,
      receivesNotifications: data.receivesNotifications ?? true,
      receivesDocuments: data.receivesDocuments ?? true,
    });
    return repository.save(link);
  }

  async unlinkPlayer(linkId: number): Promise<boolean> {
    const repository = await this.getLinkRepository();
    const link = await repository.findOne({ where: { id: linkId } });
    if (!link) {
      throw new Error("Lien non trouvé");
    }
    await repository.remove(link);
    return true;
  }
}
