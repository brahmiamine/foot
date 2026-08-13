import { getDataSource } from "@/lib/database";
import { MatchGallery } from "@/entities/MatchGallery";
import { MediaGallery } from "@/entities/MediaGallery";
import { Repository } from "typeorm";
import { MatchService } from "./MatchService";

/**
 * Service for MatchGallery operations
 * Handles associations between Matches and MediaGalleries
 * 
 * NOTE: Match entity not yet created, so methods use matchId directly
 * When Match entity is created, these methods can be enhanced
 */
export class MatchGalleryService {
  private async getMatchGalleryRepository(): Promise<Repository<MatchGallery>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MatchGallery);
  }

  private async getMediaGalleryRepository(): Promise<Repository<MediaGallery>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MediaGallery);
  }

  /**
   * Get all galleries associated with a match
   * @param matchId - Match ID
   * @returns Array of match galleries with gallery relations
   */
  async getMatchGalleries(matchId: string): Promise<MatchGallery[]> {
    const repository = await this.getMatchGalleryRepository();
    return repository.find({
      where: { matchId },
      relations: ["gallery"],
    });
  }

  /**
   * Add a gallery to a match
   * @param matchId - Match ID
   * @param galleryId - Gallery ID
   * @returns Created match gallery
   */
  async addGalleryToMatch(matchId: string, galleryId: number): Promise<MatchGallery> {
    const repository = await this.getMatchGalleryRepository();

    // Check if gallery exists
    const galleryRepo = await this.getMediaGalleryRepository();
    const gallery = await galleryRepo.findOne({ where: { id: galleryId } });
    if (!gallery) {
      throw new Error("Galerie non trouvée");
    }

    // Check if already associated
    const existing = await repository.findOne({
      where: { matchId, galleryId },
    });
    if (existing) {
      throw new Error("Cette galerie est déjà associée à ce match");
    }

    const matchGallery = repository.create({
      matchId,
      galleryId,
    });

    return repository.save(matchGallery);
  }

  /**
   * Remove a gallery from a match
   * @param matchId - Match ID
   * @param galleryId - Gallery ID
   * @param teamId - Caller's team, must be involved in the match
   * @returns true if removed
   */
  async removeGalleryFromMatch(matchId: string, galleryId: number, teamId: string): Promise<boolean> {
    // TASK-P0-012 (todo.md): without this, any staff member of any club
    // could detach another club's match/gallery association — addGalleryToMatch
    // already checked this, removeGalleryFromMatch didn't.
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

  /**
   * Remove all galleries from a match
   * @param matchId - Match ID
   * @param teamId - Caller's team, must be involved in the match
   * @returns true if removed
   */
  async removeAllGalleriesFromMatch(matchId: string, teamId: string): Promise<boolean> {
    // TASK-P0-012 (todo.md): same cross-club guard as removeGalleryFromMatch.
    const match = await new MatchService().findById(matchId, teamId);
    if (!match) {
      throw new Error("Match non trouvé");
    }

    const repository = await this.getMatchGalleryRepository();
    const matchGalleries = await repository.find({
      where: { matchId },
    });

    if (matchGalleries.length > 0) {
      await repository.remove(matchGalleries);
    }

    return true;
  }
}

