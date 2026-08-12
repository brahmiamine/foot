import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly repository: Repository<InventoryItem>,
  ) {}

  async findAllForSeller(
    sellerId: string,
    productId?: string,
  ): Promise<InventoryItem[]> {
    return this.repository.find({
      where: productId ? { sellerId, productId } : { sellerId },
    });
  }

  /** Ajuste le stock disponible — jamais `reserved`/`sold`, dérivés du traitement des commandes (E06). */
  async setAvailable(
    id: string,
    sellerId: string,
    available: number,
  ): Promise<InventoryItem> {
    const item = await this.repository.findOne({ where: { id, sellerId } });
    if (!item) throw new NotFoundException('Ligne de stock introuvable');
    item.available = available;
    return this.repository.save(item);
  }
}
