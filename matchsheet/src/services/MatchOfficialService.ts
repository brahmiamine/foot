import { getDataSource } from "@/lib/db";
import { MatchOfficial, OfficialRole, MANDATORY_OFFICIAL_ROLES } from "@/entities/MatchOfficial";
import { Repository } from "typeorm";

/**
 * Service for MatchOfficial operations (arbitre central, assistants, 4e
 * arbitre, délégué principal — écran "Infos arbitre" avant les signatures
 * avant-match).
 */
export class MatchOfficialService {
  private async getRepository(): Promise<Repository<MatchOfficial>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MatchOfficial);
  }

  async findBySheet(sheetId: number): Promise<MatchOfficial[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { sheetId } });
  }

  /**
   * Enregistre (ou remplace) les infos d'un officiel pour un poste donné.
   * Valider (confirmer) remet confirmedAt à jour ; modifier le nom/la
   * licence après confirmation redemande une confirmation explicite.
   */
  async save(
    sheetId: number,
    role: OfficialRole,
    data: { fullName?: string | null; licenseNumber?: string | null }
  ): Promise<MatchOfficial> {
    const repository = await this.getRepository();
    let official = await repository.findOne({ where: { sheetId, role } });
    if (official) {
      official.fullName = data.fullName ?? null;
      official.licenseNumber = data.licenseNumber ?? null;
      official.confirmed = false;
      official.confirmedAt = null;
    } else {
      official = repository.create({
        sheetId,
        role,
        fullName: data.fullName ?? null,
        licenseNumber: data.licenseNumber ?? null,
        confirmed: false,
      });
    }
    return repository.save(official);
  }

  async confirm(sheetId: number, role: OfficialRole): Promise<MatchOfficial> {
    const repository = await this.getRepository();
    const official = await repository.findOne({ where: { sheetId, role } });
    if (!official || !official.fullName?.trim()) {
      throw new Error("Le nom de l'officiel est requis avant validation.");
    }
    official.confirmed = true;
    official.confirmedAt = new Date();
    return repository.save(official);
  }

  /** Vrai si les 4 postes obligatoires (centre, assistants 1/2, délégué) sont confirmés. */
  async areMandatoryRolesConfirmed(sheetId: number): Promise<boolean> {
    const officials = await this.findBySheet(sheetId);
    return MANDATORY_OFFICIAL_ROLES.every((role) => officials.some((o) => o.role === role && o.confirmed));
  }
}
