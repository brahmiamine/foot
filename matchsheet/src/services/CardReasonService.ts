import { getDataSource } from "@/lib/db";
import { CardReason } from "@/entities/CardReason";
import { Repository } from "typeorm";

/** Service for CardReason reads (référentiel géré depuis superadmin). */
export class CardReasonService {
  private async getRepository(): Promise<Repository<CardReason>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(CardReason);
  }

  async findActive(): Promise<CardReason[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { isActive: true }, order: { labelFr: "ASC" } });
  }
}
