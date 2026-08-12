import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellerOrder } from './entities/seller-order.entity';

/** Scaffolding (TS-03) — workflow de fulfillment (préparation/expédition/livraison) à venir avec E06. */
@Injectable()
export class SellerOrdersService {
  constructor(
    @InjectRepository(SellerOrder)
    private readonly repository: Repository<SellerOrder>,
  ) {}

  async findAllForSeller(sellerId: string): Promise<SellerOrder[]> {
    return this.repository.find({
      where: { sellerId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }
}
