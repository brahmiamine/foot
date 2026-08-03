import { getDataSource } from "@/lib/db";
import { Sheet, SheetStatus } from "@/entities/Sheet";
import { Repository } from "typeorm";

/**
 * Service for Sheet operations (la feuille de match elle-même — statut,
 * horodatage des deux phases de signature).
 */
export class SheetService {
  private async getRepository(): Promise<Repository<Sheet>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Sheet);
  }

  /**
   * Récupère la feuille d'un match, ou la crée si elle n'existe pas encore
   * (premier accès au match depuis l'app).
   */
  async getOrCreate(matchId: string): Promise<Sheet> {
    const repository = await this.getRepository();
    let sheet = await repository.findOne({ where: { matchId } });
    if (!sheet) {
      sheet = repository.create({ matchId, status: "DRAFT" });
      sheet = await repository.save(sheet);
    }
    return sheet;
  }

  async findById(id: number): Promise<Sheet | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id } });
  }

  async updateStatus(id: number, status: SheetStatus): Promise<Sheet> {
    const repository = await this.getRepository();
    const sheet = await repository.findOne({ where: { id } });
    if (!sheet) {
      throw new Error("Feuille de match non trouvée");
    }
    sheet.status = status;
    if (status === "PRE_MATCH_SIGNED") sheet.preMatchSignedAt = new Date();
    if (status === "POST_MATCH_SIGNED") sheet.postMatchSignedAt = new Date();
    if (status === "CLOSED") sheet.closedAt = new Date();
    return repository.save(sheet);
  }
}
