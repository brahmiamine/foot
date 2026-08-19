import { getDataSource } from "@/lib/database";
import { PlayerApplication, ApplicationStatus } from "@/entities/PlayerApplication";
import { ClubFeatureSettingsService } from "./ClubFeatureSettingsService";

interface CreatePlayerApplicationData {
  childLastName: string;
  childFirstName: string;
  birthDate: string;
  category: string;
  position?: string | null;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  message?: string | null;
  documentUrl?: string | null;
}

/** Candidatures "Inscrire mon enfant", rattachées au module ACADEMY. */
export class PlayerApplicationService {
  private async assertEnabled(teamId: string): Promise<void> {
    await new ClubFeatureSettingsService().assertEnabled(teamId, "ACADEMY");
  }

  async findAll(teamId: string, status?: ApplicationStatus): Promise<PlayerApplication[]> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    return ds.getRepository(PlayerApplication).find({
      where: status ? { teamId, status } : { teamId },
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: number, teamId: string): Promise<PlayerApplication | null> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    return ds.getRepository(PlayerApplication).findOne({ where: { id, teamId } });
  }

  async create(teamId: string, data: CreatePlayerApplicationData): Promise<PlayerApplication> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const repository = ds.getRepository(PlayerApplication);
    return repository.save(repository.create({ ...data, teamId, status: "NEW" }));
  }

  async updateStatus(id: number, teamId: string, status: ApplicationStatus, adminNotes?: string | null): Promise<PlayerApplication> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const repository = ds.getRepository(PlayerApplication);
    const application = await repository.findOne({ where: { id, teamId } });
    if (!application) throw new Error("Candidature introuvable");
    application.status = status;
    if (adminNotes !== undefined) application.adminNotes = adminNotes;
    return repository.save(application);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const repository = ds.getRepository(PlayerApplication);
    const application = await repository.findOne({ where: { id, teamId } });
    if (!application) throw new Error("Candidature introuvable");
    await repository.remove(application);
    return true;
  }
}