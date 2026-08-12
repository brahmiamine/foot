import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnStatus } from './enums/return-status.enum';
import { RequestReturnDto } from './dto/request-return.dto';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { SellerOrderItem } from '../seller-orders/entities/seller-order-item.entity';
import { SellerOrderStatus } from '../seller-orders/enums/seller-order-status.enum';

/**
 * Retours marketplace (E16, US-50 à US-52). `sellerId` est dupliqué sur
 * `ReturnRequest` (plutôt que dérivé via une jointure à chaque lecture) —
 * même choix que `SellerOrder`, pour scoper directement les requêtes
 * vendeur sans jointure obligatoire.
 */
@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(ReturnRequest)
    private readonly repository: Repository<ReturnRequest>,
    @InjectRepository(SellerOrder)
    private readonly sellerOrderRepository: Repository<SellerOrder>,
    @InjectRepository(SellerOrderItem)
    private readonly sellerOrderItemRepository: Repository<SellerOrderItem>,
  ) {}

  /**
   * US-50 — DELIVERED -> RETURN_REQUESTED. Ne gère que le retour de la
   * commande dans son ensemble (le modèle `SellerOrderStatus` n'a pas
   * d'état par ligne) : `sellerOrderItemId` sert à documenter quel article
   * est concerné, pas à permettre un retour partiel côté statut.
   */
  async request(dto: RequestReturnDto): Promise<ReturnRequest> {
    const order = await this.sellerOrderRepository.findOne({
      where: { id: dto.sellerOrderId },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    const item = await this.sellerOrderItemRepository.findOne({
      where: { id: dto.sellerOrderItemId, sellerOrderId: dto.sellerOrderId },
    });
    if (!item) throw new NotFoundException('Article de commande introuvable');

    if (order.status !== SellerOrderStatus.DELIVERED) {
      throw new ConflictException(
        `Retour impossible : commande au statut ${order.status} (attendu DELIVERED)`,
      );
    }

    const returnRequest = this.repository.create({
      sellerId: order.sellerId,
      sellerOrderId: order.id,
      sellerOrderItemId: item.id,
      customerName: dto.customerName,
      reason: dto.reason,
      status: ReturnStatus.REQUESTED,
    });
    await this.repository.save(returnRequest);

    order.status = SellerOrderStatus.RETURN_REQUESTED;
    await this.sellerOrderRepository.save(order);

    return returnRequest;
  }

  async findAllForSeller(sellerId: string): Promise<ReturnRequest[]> {
    return this.repository.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForSeller(id: string, sellerId: string): Promise<ReturnRequest> {
    const returnRequest = await this.repository.findOne({
      where: { id, sellerId },
    });
    if (!returnRequest)
      throw new NotFoundException('Demande de retour introuvable');
    return returnRequest;
  }

  private async loadOrder(sellerOrderId: string): Promise<SellerOrder> {
    const order = await this.sellerOrderRepository.findOne({
      where: { id: sellerOrderId },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    return order;
  }

  /**
   * US-51 — la marketplace (ici : le vendeur, qui reçoit physiquement
   * l'article) approuve ou rejette la demande. Un rejet restaure
   * `DELIVERED` (le retour n'a pas eu lieu) ; une approbation laisse
   * `RETURN_REQUESTED` (article pas encore reçu en retour, voir complete()).
   */
  async decide(
    id: string,
    sellerId: string,
    approve: boolean,
  ): Promise<ReturnRequest> {
    const returnRequest = await this.findOneForSeller(id, sellerId);
    if (returnRequest.status !== ReturnStatus.REQUESTED) {
      throw new ConflictException(
        `Décision impossible : demande au statut ${returnRequest.status} (attendu REQUESTED)`,
      );
    }

    returnRequest.status = approve
      ? ReturnStatus.APPROVED
      : ReturnStatus.REJECTED;
    await this.repository.save(returnRequest);

    if (!approve) {
      const order = await this.loadOrder(returnRequest.sellerOrderId);
      order.status = SellerOrderStatus.DELIVERED;
      await this.sellerOrderRepository.save(order);
    }

    return returnRequest;
  }

  /**
   * US-52 — APPROVED -> COMPLETED, article physiquement reçu en retour.
   * Ne déclenche aucun remboursement réel : `payment-api` n'expose pas
   * encore de Refund API (voir avancement.md, Epic E04/E15) — le statut
   * `REFUNDED` de `SellerOrderStatus` reste donc hors de portée de cette
   * méthode, un remboursement retenu comme geste manuel jusqu'à ce que
   * cette API existe.
   */
  async complete(id: string, sellerId: string): Promise<ReturnRequest> {
    const returnRequest = await this.findOneForSeller(id, sellerId);
    if (returnRequest.status !== ReturnStatus.APPROVED) {
      throw new ConflictException(
        `Complétion impossible : demande au statut ${returnRequest.status} (attendu APPROVED)`,
      );
    }

    returnRequest.status = ReturnStatus.COMPLETED;
    await this.repository.save(returnRequest);

    const order = await this.loadOrder(returnRequest.sellerOrderId);
    order.status = SellerOrderStatus.RETURNED;
    await this.sellerOrderRepository.save(order);

    return returnRequest;
  }
}
