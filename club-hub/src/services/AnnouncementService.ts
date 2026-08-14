import { getDataSource } from "@/lib/database";
import { Announcement, AnnouncementCategory } from "@/entities/Announcement";
import { Repository } from "typeorm";

interface AnnouncementData {
  title: string;
  contentHtml: string;
  category: AnnouncementCategory;
}

/** Service pour les communiqués officiels (/communiques). */
export class AnnouncementService {
  private async getRepository(): Promise<Repository<Announcement>> {
    const ds = await getDataSource();
    return ds.getRepository(Announcement);
  }

  async findAll(teamId: string): Promise<Announcement[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId }, order: { createdAt: "DESC" } });
  }

  async findAllPublished(teamId: string): Promise<Announcement[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId, isPublished: true }, order: { publishedAt: "DESC" } });
  }

  async findById(id: number, teamId: string): Promise<Announcement | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  async create(teamId: string, data: AnnouncementData): Promise<Announcement> {
    const repository = await this.getRepository();
    return repository.save(repository.create({ ...data, teamId, isPublished: false }));
  }

  async update(id: number, teamId: string, data: Partial<AnnouncementData>): Promise<Announcement> {
    const repository = await this.getRepository();
    const announcement = await repository.findOne({ where: { id, teamId } });
    if (!announcement) throw new Error("Communiqué introuvable");
    Object.assign(announcement, data);
    return repository.save(announcement);
  }

  async setPublished(id: number, teamId: string, isPublished: boolean): Promise<Announcement> {
    const repository = await this.getRepository();
    const announcement = await repository.findOne({ where: { id, teamId } });
    if (!announcement) throw new Error("Communiqué introuvable");
    announcement.isPublished = isPublished;
    announcement.publishedAt = isPublished ? new Date() : null;
    return repository.save(announcement);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const announcement = await repository.findOne({ where: { id, teamId } });
    if (!announcement) throw new Error("Communiqué introuvable");
    await repository.remove(announcement);
    return true;
  }
}
