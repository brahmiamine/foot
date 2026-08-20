import { getDataSource } from "@/lib/database";
import { RecruitmentNeed } from "@/entities/RecruitmentNeed";
import { RecruitmentApplication, type RecruitmentApplicationStatus } from "@/entities/RecruitmentApplication";
import { ClubFeatureSettingsService } from "./ClubFeatureSettingsService";

interface RecruitmentNeedData {
  category: string;
  position: string;
  descriptionFr?: string | null;
  descriptionAr?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}

interface CreateRecruitmentApplicationData {
  name: string;
  birthDate: string;
  category: string;
  position: string;
  currentClub?: string | null;
  parentPhone: string;
  email?: string | null;
  videoUrl?: string | null;
  message?: string | null;
}

/** Service pour la page /recrutement : besoins + lecture/création publique. */
export class RecruitmentService {
  private async assertEnabled(teamId: string): Promise<void> {
    await new ClubFeatureSettingsService().assertEnabled(teamId, "RECRUITMENT");
  }

  async findAllNeeds(teamId: string, activeOnly = false): Promise<RecruitmentNeed[]> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    return ds.getRepository(RecruitmentNeed).find({
      where: activeOnly ? { teamId, isActive: true } : { teamId },
      order: { displayOrder: "ASC" },
    });
  }

  async createNeed(teamId: string, data: RecruitmentNeedData): Promise<RecruitmentNeed> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const repository = ds.getRepository(RecruitmentNeed);
    return repository.save(repository.create({ ...data, teamId }));
  }

  async updateNeed(id: number, teamId: string, data: Partial<RecruitmentNeedData>): Promise<RecruitmentNeed> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const repository = ds.getRepository(RecruitmentNeed);
    const need = await repository.findOne({ where: { id, teamId } });
    if (!need) throw new Error("Poste recherché introuvable");
    Object.assign(need, data);
    return repository.save(need);
  }

  async deleteNeed(id: number, teamId: string): Promise<boolean> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const repository = ds.getRepository(RecruitmentNeed);
    const need = await repository.findOne({ where: { id, teamId } });
    if (!need) throw new Error("Poste recherché introuvable");
    await repository.remove(need);
    return true;
  }

  async findAllApplications(
    teamId: string,
    status?: RecruitmentApplicationStatus,
  ): Promise<RecruitmentApplication[]> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    return ds.getRepository(RecruitmentApplication).find({
      where: status ? { teamId, status } : { teamId },
      order: { createdAt: "DESC" },
    });
  }

  async findApplicationById(id: number, teamId: string): Promise<RecruitmentApplication | null> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    return ds.getRepository(RecruitmentApplication).findOne({ where: { id, teamId } });
  }

  /** Soumission publique, sans authentification. */
  async createApplication(teamId: string, data: CreateRecruitmentApplicationData): Promise<RecruitmentApplication> {
    await this.assertEnabled(teamId);
    const ds = await getDataSource();
    const repository = ds.getRepository(RecruitmentApplication);
    return repository.save(repository.create({ ...data, teamId, status: "NEW" }));
  }
}
