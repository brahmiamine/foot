import { getDataSource } from "@/lib/db";
import { Signature, SignaturePhase, ActorRole } from "@/entities/Signature";
import { Repository } from "typeorm";

/**
 * Service for Signature operations (signature dessinée par l'un des trois
 * acteurs — équipe domicile, équipe extérieure, arbitre — pour chaque phase).
 */
export class SignatureService {
  private async getRepository(): Promise<Repository<Signature>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Signature);
  }

  async findBySheet(sheetId: number): Promise<Signature[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { sheetId } });
  }

  /**
   * Enregistre (ou remplace) la signature d'un acteur pour une phase donnée.
   */
  async save(
    sheetId: number,
    phase: SignaturePhase,
    actorRole: ActorRole,
    data: { signerName?: string | null; signatureData: string }
  ): Promise<Signature> {
    const repository = await this.getRepository();
    let signature = await repository.findOne({ where: { sheetId, phase, actorRole } });
    if (signature) {
      signature.signerName = data.signerName ?? signature.signerName;
      signature.signatureData = data.signatureData;
      signature.signedAt = new Date();
    } else {
      signature = repository.create({
        sheetId,
        phase,
        actorRole,
        signerName: data.signerName ?? null,
        signatureData: data.signatureData,
      });
    }
    return repository.save(signature);
  }

  /**
   * Vrai si les 3 acteurs (domicile, extérieur, arbitre) ont signé pour
   * cette phase.
   */
  async isPhaseComplete(sheetId: number, phase: SignaturePhase): Promise<boolean> {
    const repository = await this.getRepository();
    const count = await repository.count({ where: { sheetId, phase } });
    return count >= 3;
  }
}
