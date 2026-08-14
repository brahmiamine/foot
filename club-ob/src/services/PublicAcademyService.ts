import { getDataSource } from "@/lib/database";
import { AcademyCategory } from "@/entities/AcademyCategory";
import { AcademyInfo } from "@/entities/AcademyInfo";
import { RecruitmentNeed } from "@/entities/RecruitmentNeed";

/** Service lecture seule pour les pages /formation et /recrutement. */
export class PublicAcademyService {
  async getCategories(teamId: string): Promise<AcademyCategory[]> {
    const ds = await getDataSource();
    return ds.getRepository(AcademyCategory).find({ where: { teamId, isActive: true }, order: { displayOrder: "ASC" } });
  }

  async getInfo(teamId: string): Promise<AcademyInfo | null> {
    const ds = await getDataSource();
    return ds.getRepository(AcademyInfo).findOne({ where: { teamId } });
  }

  async getActiveRecruitmentNeeds(teamId: string): Promise<RecruitmentNeed[]> {
    const ds = await getDataSource();
    return ds.getRepository(RecruitmentNeed).find({ where: { teamId, isActive: true }, order: { displayOrder: "ASC" } });
  }
}
