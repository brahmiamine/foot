import { getDataSource } from "@/lib/database";
import { AcademyCategory } from "@/entities/AcademyCategory";
import { AcademyInfo } from "@/entities/AcademyInfo";

interface AcademyCategoryData {
  code: string;
  nameFr: string;
  nameAr?: string | null;
  ageRangeFr?: string | null;
  descriptionFr?: string | null;
  descriptionAr?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}

interface AcademyInfoData {
  philosophyFr?: string | null;
  philosophyAr?: string | null;
  methodFr?: string | null;
  methodAr?: string | null;
  supervisionFr?: string | null;
  supervisionAr?: string | null;
  infrastructureFr?: string | null;
  infrastructureAr?: string | null;
  detectionFr?: string | null;
  detectionAr?: string | null;
}

/** Service pour la page /formation : catégories U6 -> Seniors + contenu éditorial (singleton). */
export class AcademyService {
  async findAllCategories(teamId: string): Promise<AcademyCategory[]> {
    const ds = await getDataSource();
    return ds.getRepository(AcademyCategory).find({ where: { teamId }, order: { displayOrder: "ASC" } });
  }

  async createCategory(teamId: string, data: AcademyCategoryData): Promise<AcademyCategory> {
    const ds = await getDataSource();
    const repository = ds.getRepository(AcademyCategory);
    return repository.save(repository.create({ ...data, teamId }));
  }

  async updateCategory(id: number, teamId: string, data: Partial<AcademyCategoryData>): Promise<AcademyCategory> {
    const ds = await getDataSource();
    const repository = ds.getRepository(AcademyCategory);
    const category = await repository.findOne({ where: { id, teamId } });
    if (!category) throw new Error("Catégorie introuvable");
    Object.assign(category, data);
    return repository.save(category);
  }

  async deleteCategory(id: number, teamId: string): Promise<boolean> {
    const ds = await getDataSource();
    const repository = ds.getRepository(AcademyCategory);
    const category = await repository.findOne({ where: { id, teamId } });
    if (!category) throw new Error("Catégorie introuvable");
    await repository.remove(category);
    return true;
  }

  async getInfo(teamId: string): Promise<AcademyInfo | null> {
    const ds = await getDataSource();
    return ds.getRepository(AcademyInfo).findOne({ where: { teamId } });
  }

  async saveInfo(teamId: string, data: AcademyInfoData): Promise<AcademyInfo> {
    const ds = await getDataSource();
    const repository = ds.getRepository(AcademyInfo);
    const existing = await repository.findOne({ where: { teamId } });
    if (existing) {
      Object.assign(existing, data);
      return repository.save(existing);
    }
    return repository.save(repository.create({ ...data, teamId }));
  }
}
