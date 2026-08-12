import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly repository: Repository<InventoryItem>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAllForSeller(
    sellerId: string,
    productId?: string,
  ): Promise<InventoryItem[]> {
    return this.repository.find({
      where: productId ? { sellerId, productId } : { sellerId },
    });
  }

  /**
   * Ajuste le stock disponible et, optionnellement, le seuil d'alerte —
   * jamais `reserved`/`sold`, dérivés du traitement des commandes (E06).
   * Envoie une notification LOW_STOCK au vendeur au moment précis où le
   * stock franchit le seuil vers le bas (pas à chaque sauvegarde tant
   * qu'il reste sous le seuil, pour ne pas spammer).
   */
  async setAvailable(
    id: string,
    sellerId: string,
    available: number,
    lowStockThreshold?: number | null,
  ): Promise<InventoryItem> {
    const item = await this.repository.findOne({
      where: { id, sellerId },
      relations: { product: true, variant: true },
    });
    if (!item) throw new NotFoundException('Ligne de stock introuvable');

    const previousAvailable = item.available;
    item.available = available;
    if (lowStockThreshold !== undefined) {
      item.lowStockThreshold = lowStockThreshold;
    }

    const saved = await this.repository.save(item);

    const threshold = saved.lowStockThreshold;
    const crossedIntoLowStock =
      threshold !== null &&
      saved.available <= threshold &&
      previousAvailable > threshold;

    if (crossedIntoLowStock) {
      const label = saved.variant
        ? `${saved.product?.name ?? 'Produit'} (${saved.variant.sku})`
        : (saved.product?.name ?? 'Produit');
      await this.notificationsService.notify(
        sellerId,
        NotificationType.LOW_STOCK,
        'Stock bas',
        `Le stock disponible de "${label}" est passé à ${saved.available} unité(s), sous le seuil d'alerte de ${threshold}.`,
      );
    }

    return saved;
  }
}
