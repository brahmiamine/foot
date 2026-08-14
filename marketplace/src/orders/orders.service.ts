import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketOrder } from './entities/market-order.entity';

/** Scaffolding (TS-03) — création/checkout hors périmètre tant que le tunnel d'achat marketplace n'existe pas (E05/E06). */
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(MarketOrder)
    private readonly repository: Repository<MarketOrder>,
  ) {}

  async findById(id: string): Promise<MarketOrder> {
    const order = await this.repository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Commande introuvable');
    return order;
  }
}
