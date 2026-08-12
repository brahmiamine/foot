import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payout } from './entities/payout.entity';

/** Scaffolding (TS-03) — calcul de solde et déclenchement réel du virement à venir avec E15. */
@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Payout)
    private readonly repository: Repository<Payout>,
  ) {}

  async findAllForSeller(sellerId: string): Promise<Payout[]> {
    return this.repository.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }
}
