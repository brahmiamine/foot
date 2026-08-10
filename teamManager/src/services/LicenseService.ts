import { getDataSource } from "@/lib/database";
import { License, LicenseStatus } from "@/entities/License";
import { Repository } from "typeorm";

/**
 * Service for License operations — licences FTF des joueurs/staff. Cette
 * app n'est PAS la source officielle : les colonnes `external*` préparent
 * une future synchronisation avec le système de gestion des licences de la
 * FTF (cache/import), en attendant la licence est saisie/suivie ici.
 */
export class LicenseService {
  private async getRepository(): Promise<Repository<License>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(License);
  }

  async findAll(teamId: string): Promise<License[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId }, relations: ["player", "staff", "season"], order: { expiresAt: "ASC" } });
  }

  async findById(id: number, teamId: string): Promise<License | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId }, relations: ["player", "staff"] });
  }

  /** Licence active la plus récente d'un joueur (utilisée par EligibilityService). */
  async findActiveForPlayer(playerId: string, teamId: string): Promise<License | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { teamId, playerId, holderType: "PLAYER" }, order: { expiresAt: "DESC" } });
  }

  async create(
    data: {
      seasonId?: number | null;
      holderType: "PLAYER" | "STAFF";
      playerId?: string | null;
      staffId?: number | null;
      licenseNumber?: string | null;
      licenseType?: "PLAYER" | "COACH" | "EXECUTIVE" | "OTHER";
      status?: LicenseStatus;
      issuedAt?: string | null;
      expiresAt?: string | null;
      documentUrl?: string | null;
      notes?: string | null;
    },
    teamId: string
  ): Promise<License> {
    const repository = await this.getRepository();
    if ((data.holderType === "PLAYER" && !data.playerId) || (data.holderType === "STAFF" && !data.staffId)) {
      throw new Error("Titulaire de la licence manquant");
    }
    const license = repository.create({ ...data, teamId, licenseType: data.licenseType ?? "PLAYER", status: data.status ?? "PENDING" });
    return repository.save(license);
  }

  async update(
    id: number,
    teamId: string,
    data: Partial<{
      seasonId: number | null;
      licenseNumber: string | null;
      licenseType: "PLAYER" | "COACH" | "EXECUTIVE" | "OTHER";
      status: LicenseStatus;
      issuedAt: string | null;
      expiresAt: string | null;
      documentUrl: string | null;
      notes: string | null;
    }>
  ): Promise<License> {
    const repository = await this.getRepository();
    const license = await this.findById(id, teamId);
    if (!license) {
      throw new Error("Licence non trouvée");
    }
    Object.assign(license, data);
    return repository.save(license);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const license = await this.findById(id, teamId);
    if (!license) {
      throw new Error("Licence non trouvée");
    }
    await repository.remove(license);
    return true;
  }
}
