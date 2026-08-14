import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellerOrder } from './entities/seller-order.entity';
import {
  SELLER_ALLOWED_ORDER_TRANSITIONS,
  SellerOrderStatus,
} from './enums/seller-order-status.enum';
import { ShipSellerOrderDto } from './dto/ship-seller-order.dto';

/**
 * Fulfillment boutique (E06/TS-20 à US-24) : préparation, expédition,
 * livraison d'une sous-commande vendeur. Création des commandes toujours
 * hors périmètre (pas de tunnel d'achat marketplace, voir OrdersService) —
 * ce service opère sur des SellerOrder déjà existantes.
 */
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

  async findOneForSeller(id: string, sellerId: string): Promise<SellerOrder> {
    const order = await this.repository.findOne({
      where: { id, sellerId },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    return order;
  }

  private async transition(
    id: string,
    sellerId: string,
    nextStatus: SellerOrderStatus,
  ): Promise<SellerOrder> {
    const order = await this.findOneForSeller(id, sellerId);
    const allowed = SELLER_ALLOWED_ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new ConflictException(
        `Transition ${order.status} → ${nextStatus} non autorisée`,
      );
    }
    order.status = nextStatus;
    return this.repository.save(order);
  }

  /** US-21 — CONFIRMED (payée) -> PROCESSING (préparation). */
  async prepare(id: string, sellerId: string): Promise<SellerOrder> {
    return this.transition(id, sellerId, SellerOrderStatus.PROCESSING);
  }

  /** US-22 — PROCESSING -> READY_TO_SHIP. */
  async markReadyToShip(id: string, sellerId: string): Promise<SellerOrder> {
    return this.transition(id, sellerId, SellerOrderStatus.READY_TO_SHIP);
  }

  /** US-23 — READY_TO_SHIP -> SHIPPED, avec transporteur/numéro de suivi obligatoires. */
  async ship(
    id: string,
    sellerId: string,
    dto: ShipSellerOrderDto,
  ): Promise<SellerOrder> {
    const order = await this.findOneForSeller(id, sellerId);
    const allowed = SELLER_ALLOWED_ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(SellerOrderStatus.SHIPPED)) {
      throw new ConflictException(
        `Transition ${order.status} → ${SellerOrderStatus.SHIPPED} non autorisée`,
      );
    }
    order.status = SellerOrderStatus.SHIPPED;
    order.shippingCarrier = dto.carrier;
    order.trackingNumber = dto.trackingNumber;
    order.shippedAt = new Date();
    return this.repository.save(order);
  }

  /**
   * US-24 — SHIPPED -> DELIVERED. Notification au membre acheteur hors
   * périmètre : `MarketOrder` ne porte qu'un email/nom déclaratif, pas de
   * compte SSO ni d'outbox notification côté marketplace à ce jour
   * (voir avancement.md, Epic E07/TS-25).
   */
  async markDelivered(id: string, sellerId: string): Promise<SellerOrder> {
    const order = await this.transition(
      id,
      sellerId,
      SellerOrderStatus.DELIVERED,
    );
    order.deliveredAt = new Date();
    return this.repository.save(order);
  }
}
