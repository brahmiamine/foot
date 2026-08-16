import { getDataSource } from "@/lib/db";
import { Reservation } from "@/entities/Reservation";
import { SignaturePhase, ActorRole } from "@/entities/Signature";
import { Repository } from "typeorm";

interface CreateReservationInput {
  sheetId: number;
  phase: SignaturePhase;
  authorRole: ActorRole;
  content: string;
}

/** Service for Reservation operations (réserves déposées avant/après match). */
export class ReservationService {
  private async getRepository(): Promise<Repository<Reservation>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Reservation);
  }

  async findBySheet(sheetId: number): Promise<Reservation[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { sheetId }, order: { createdAt: "ASC" } });
  }

  async findById(id: number): Promise<Reservation | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id } });
  }

  async create(data: CreateReservationInput): Promise<Reservation> {
    const repository = await this.getRepository();
    const reservation = repository.create(data);
    return repository.save(reservation);
  }

  async delete(id: number): Promise<void> {
    const repository = await this.getRepository();
    await repository.delete({ id });
  }
}
