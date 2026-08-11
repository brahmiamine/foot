import { getDataSource } from "@/lib/database";
import { Announcement } from "@/entities/Announcement";

/** Service lecture seule pour la page /communiques. */
export class PublicAnnouncementService {
  async getPublished(teamId: string): Promise<Announcement[]> {
    const ds = await getDataSource();
    return ds.getRepository(Announcement).find({ where: { teamId, isPublished: true }, order: { publishedAt: "DESC" } });
  }
}
