import { getDataSource } from "@/lib/database";
import { ClubInfo } from "@/entities/ClubInfo";
import { History } from "@/entities/History";
import { HistoryFigure, HistoryFigureCategory } from "@/entities/HistoryFigure";
import { Honor } from "@/entities/Honor";

interface ClubInfoData {
  presentationFr?: string | null;
  presentationAr?: string | null;
  valuesFr?: string | null;
  valuesAr?: string | null;
  sportProjectFr?: string | null;
  sportProjectAr?: string | null;
  organizationFr?: string | null;
  organizationAr?: string | null;
}

interface HistoryData {
  foundedDate?: string | null;
  storyFr?: string | null;
  storyAr?: string | null;
}

interface HistoryFigureData {
  category: HistoryFigureCategory;
  nameFr: string;
  nameAr?: string | null;
  periodFr?: string | null;
  descriptionFr?: string | null;
  descriptionAr?: string | null;
  photoUrl?: string | null;
  displayOrder?: number;
}

interface HonorData {
  competitionFr: string;
  competitionAr?: string | null;
  titleCount?: number;
  yearsFr?: string | null;
  icon?: string | null;
  displayOrder?: number;
}

/**
 * Service pour les pages /club et /club/histoire : présentation du club
 * (singleton), récit d'histoire (singleton), grandes figures et palmarès
 * (listes ordonnées).
 */
export class ClubContentService {
  // ----- Présentation du club (singleton) -----

  async getClubInfo(teamId: string): Promise<ClubInfo | null> {
    const ds = await getDataSource();
    return ds.getRepository(ClubInfo).findOne({ where: { teamId } });
  }

  async saveClubInfo(teamId: string, data: ClubInfoData): Promise<ClubInfo> {
    const ds = await getDataSource();
    const repository = ds.getRepository(ClubInfo);
    const existing = await repository.findOne({ where: { teamId } });
    if (existing) {
      Object.assign(existing, data);
      return repository.save(existing);
    }
    return repository.save(repository.create({ ...data, teamId }));
  }

  // ----- Histoire du club (singleton) -----

  async getHistory(teamId: string): Promise<History | null> {
    const ds = await getDataSource();
    return ds.getRepository(History).findOne({ where: { teamId } });
  }

  async saveHistory(teamId: string, data: HistoryData): Promise<History> {
    const ds = await getDataSource();
    const repository = ds.getRepository(History);
    const existing = await repository.findOne({ where: { teamId } });
    if (existing) {
      Object.assign(existing, data);
      return repository.save(existing);
    }
    return repository.save(repository.create({ ...data, teamId }));
  }

  // ----- Grandes figures (liste) -----

  async findAllFigures(teamId: string): Promise<HistoryFigure[]> {
    const ds = await getDataSource();
    return ds.getRepository(HistoryFigure).find({ where: { teamId }, order: { category: "ASC", displayOrder: "ASC" } });
  }

  async createFigure(teamId: string, data: HistoryFigureData): Promise<HistoryFigure> {
    const ds = await getDataSource();
    const repository = ds.getRepository(HistoryFigure);
    return repository.save(repository.create({ ...data, teamId }));
  }

  async updateFigure(id: number, teamId: string, data: Partial<HistoryFigureData>): Promise<HistoryFigure> {
    const ds = await getDataSource();
    const repository = ds.getRepository(HistoryFigure);
    const figure = await repository.findOne({ where: { id, teamId } });
    if (!figure) throw new Error("Figure introuvable");
    Object.assign(figure, data);
    return repository.save(figure);
  }

  async deleteFigure(id: number, teamId: string): Promise<boolean> {
    const ds = await getDataSource();
    const repository = ds.getRepository(HistoryFigure);
    const figure = await repository.findOne({ where: { id, teamId } });
    if (!figure) throw new Error("Figure introuvable");
    await repository.remove(figure);
    return true;
  }

  // ----- Palmarès (liste) -----

  async findAllHonors(teamId: string): Promise<Honor[]> {
    const ds = await getDataSource();
    return ds.getRepository(Honor).find({ where: { teamId }, order: { displayOrder: "ASC" } });
  }

  async createHonor(teamId: string, data: HonorData): Promise<Honor> {
    const ds = await getDataSource();
    const repository = ds.getRepository(Honor);
    return repository.save(repository.create({ ...data, teamId }));
  }

  async updateHonor(id: number, teamId: string, data: Partial<HonorData>): Promise<Honor> {
    const ds = await getDataSource();
    const repository = ds.getRepository(Honor);
    const honor = await repository.findOne({ where: { id, teamId } });
    if (!honor) throw new Error("Palmarès introuvable");
    Object.assign(honor, data);
    return repository.save(honor);
  }

  async deleteHonor(id: number, teamId: string): Promise<boolean> {
    const ds = await getDataSource();
    const repository = ds.getRepository(Honor);
    const honor = await repository.findOne({ where: { id, teamId } });
    if (!honor) throw new Error("Palmarès introuvable");
    await repository.remove(honor);
    return true;
  }
}
