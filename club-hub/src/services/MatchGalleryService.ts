import { getDataSource } from "@/lib/database";
import { MatchGallery } from "@/entities/MatchGallery";
import { MediaGallery } from "@/entities/MediaGallery";
import { In, Repository } from "typeorm";
import { MatchService } from "./MatchService";

/** Service for associations between matches and media galleries. */
export class MatchGalleryService {
  private async getMatchGalleryRepository(): Promise<Repository<MatchGallery>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MatchGallery);
  }

  private async getMediaGalleryRepository(): Promise<Repository<MediaGallery>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MediaGallery);
  }

  async getMatchGalleries(matchId: string): Promise<MatchGallery[]> {
    const repository = await this.getMatchGalleryRepository();
    return repository.find({
      where: { matchId },
      relations: ["gallery"],
    });
  }

  /**
   * Return gallery counts for many matches in one query.
   * This is intentionally aggregation-only so list pages do not load all gallery rows.
   */
  async countByMatchIds(matchIds: string[]): Promise<Map<string, number>> {
    if (matchIds.length === 0) return new Map();

    const repository = await this.getMatchGalleryRepository();
    const rows = await repository
      .createQueryBuilder("matchGallery")
      .select("matchGallery.matchId", "matchId")
      .addSelect("COUNT(*)", "count")
      .where({ matchId: In(matchIds) })
      .groupBy("matchGallery.matchId")
      .getRawMany<{ matchId: string; count: string }>();

    return new Map(rows.map((row) => [row.matchId, Number(row.count)]));
  }

  async addGalleryToMatch(matchId: string, galleryId: number): Promise<MatchGallery> {
    const repository = await this.getMatchGalleryRepository();

    const galleryRepo = await this.getMediaGalleryRepository();
    const gallery = await galleryRepo.findOne({ where: { id: galleryId } });
    if (!gallery) {
      throw new Error("Galerie non trouvée");
    }

    const existing = await repository.findOne({
      where: { matchId, galleryId },
    });
    if (existing) {
      throw new Error("Cette galerie est déjà associée à ce match");
    }

    const matchGallery = repository.create({ matchId, galleryId });
    return repository.save(matchGallery);
  }

  async removeGalleryFromMatch(matchId: string, galleryId: number, teamId: string): Promise<boolean> {
    const match = await new MatchService().findById(matchId, teamId);
    if (!match) {
      throw new Error("Match non trouvé");
    }

    const repository = await this.getMatchGalleryRepository();
    const matchGallery = await repository.findOne({
      where: { matchId, galleryId },
    });

    if (!matchGallery) {
      throw new Error("Galerie non trouvée pour ce match");
    }

    await repository.remove(matchGallery);
    return true;
  }

  async removeAllGalleriesFromMatch(matchId: string, teamId: string): Promise<boolean> {
    const match = await new MatchService().findById(matchId, teamId);
    if (!match) {
      throw new Error("Match non trouvé");
    }

    const repository = await this.getMatchGalleryRepository();
    const matchGalleries = await repository.find({ where: { matchId } });

    if (matchGalleries.length > 0) {
      await repository.remove(matchGalleries);
    }

    return true;
  }
}
