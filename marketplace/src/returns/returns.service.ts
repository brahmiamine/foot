import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnStatus } from './enums/return-status.enum';
import { RequestReturnDto } from './dto/request-return.dto';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { SellerOrderItem } from '../seller-orders/entities/seller-order-item.entity';
import { SellerOrderStatus } from '../seller-orders/enums/seller-order-status.enum';
import { MarketOrder } from '../orders/entities/market-order.entity';
import { PaymentApiClientService } from '../checkout/payments-client.service';
import { NotificationApiClientService } from '../checkout/notifications-client.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

/** Statuts de remboursement chez payments qui ne sont pas encore terminaux. */
const PENDING_REFUND_STATUSES = ['REQUESTED', 'PROCESSING', 'MANUAL_REVIEW'];

/**
 * Retours marketplace (E16, US-50 à US-52 ; TASK-P0-006 pour le lien
 * remboursement/payout). `sellerId` est dupliqué sur `ReturnRequest`
 * (plutôt que dérivé via une jointure à chaque lecture) — même choix que
 * `SellerOrder`, pour scoper directement les requêtes vendeur sans
 * jointure obligatoire.
 */
@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    @InjectRepository(ReturnRequest)
    private readonly repository: Repository<ReturnRequest>,
    @InjectRepository(SellerOrder)
    private readonly sellerOrderRepository: Repository<SellerOrder>,
    @InjectRepository(SellerOrderItem)
    private readonly sellerOrderItemRepository: Repository<SellerOrderItem>,
    @InjectRepository(MarketOrder)
    private readonly marketOrderRepository: Repository<MarketOrder>,
    private readonly paymentApiClient: PaymentApiClientService,
    private readonly notificationApiClient: NotificationApiClientService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * US-50 — DELIVERED -> RETURN_REQUESTED. Ne gère que le retour de la
   * commande dans son ensemble (le modèle `SellerOrderStatus` n'a pas
   * d'état par ligne) : `sellerOrderItemId` sert à documenter quel article
   * est concerné, et détermine le montant remboursé à la complétion — pas
   * à permettre un retour partiel côté statut.
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
   * TASK-P0-006 : COMPLETED ne signifie plus à lui seul « remboursé » —
   * cette méthode ouvre automatiquement un remboursement auprès de
   * payments (TASK-P0-001) pour le montant de la ligne retournée
   * (`SellerOrderItem.totalPrice`), un remboursement par construction
   * partiel dès que la commande globale contient d'autres vendeurs/lignes
   * (voir payments/README.md § Limites connues : un remboursement
   * partiel ou Konnect/Paymee passe systématiquement par MANUAL_REVIEW,
   * jamais un succès simulé). `REFUNDED` n'est atteint qu'après
   * confirmation financière (statut SUCCEEDED) — pas à cet appel pour les
   * autres fournisseurs, résolu ensuite par
   * ReturnRefundReconciliationService ou par relecture immédiate ici quand
   * payments répond déjà SUCCEEDED (Flouci, remboursement total unique).
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

    await this.triggerRefund(returnRequest, order);

    return returnRequest;
  }

  /**
   * TASK-P0-006 — rejeu explicite d'un remboursement dont la demande
   * initiale a échoué (payments indisponible, réponse invalide, etc.).
   * Réutilise la même clé d'idempotence (`return:<id>`) : si la demande
   * initiale avait en réalité été acceptée côté payments malgré une
   * réponse perdue côté client, ce rejeu renvoie le remboursement déjà
   * créé plutôt que d'en créer un second.
   */
  async retryRefund(id: string, sellerId: string): Promise<ReturnRequest> {
    const returnRequest = await this.findOneForSeller(id, sellerId);
    if (returnRequest.status !== ReturnStatus.REFUND_FAILED) {
      throw new ConflictException(
        `Rejeu impossible : demande au statut ${returnRequest.status} (attendu REFUND_FAILED)`,
      );
    }
    const order = await this.loadOrder(returnRequest.sellerOrderId);

    returnRequest.status = ReturnStatus.COMPLETED;
    returnRequest.refundError = null;
    await this.repository.save(returnRequest);

    await this.triggerRefund(returnRequest, order);

    return returnRequest;
  }

  /**
   * TASK-P0-006 — relit auprès de payments le statut d'un remboursement
   * encore en cours (REQUESTED/PROCESSING/MANUAL_REVIEW) et fait avancer le
   * retour vers son état terminal une fois la réponse financière connue.
   * Appelée par ReturnRefundReconciliationService (scheduler) ; sans effet
   * si le remboursement n'a pas encore atteint d'état terminal.
   */
  async reconcileRefund(returnRequest: ReturnRequest): Promise<boolean> {
    if (!returnRequest.refundId) return false;

    const status = await this.paymentApiClient.getRefundStatus(
      returnRequest.refundId,
    );
    if (status === 'UNKNOWN' || status === returnRequest.refundStatus) {
      return false;
    }

    returnRequest.refundStatus = status;

    if (status === 'SUCCEEDED') {
      returnRequest.status = ReturnStatus.REFUNDED;
      const order = await this.loadOrder(returnRequest.sellerOrderId);
      order.status = SellerOrderStatus.REFUNDED;
      await this.sellerOrderRepository.save(order);
      await this.repository.save(returnRequest);
      await this.notifyOutcome(returnRequest);
      return true;
    }

    if (status === 'FAILED') {
      returnRequest.status = ReturnStatus.REFUND_FAILED;
      returnRequest.refundError =
        'Le remboursement a échoué côté fournisseur de paiement.';
      await this.repository.save(returnRequest);
      await this.notifyOutcome(returnRequest);
      return true;
    }

    // Toujours REQUESTED/PROCESSING/MANUAL_REVIEW : juste le statut affiché
    // qui change, pas encore d'état terminal.
    await this.repository.save(returnRequest);
    return false;
  }

  /** Retours dont le remboursement est encore en cours — pour le scheduler. */
  async findPendingRefunds(limit: number): Promise<ReturnRequest[]> {
    return this.repository.find({
      where: {
        status: ReturnStatus.COMPLETED,
        refundStatus: In(PENDING_REFUND_STATUSES),
      },
      take: limit,
    });
  }

  private async triggerRefund(
    returnRequest: ReturnRequest,
    order: SellerOrder,
  ): Promise<void> {
    const item = await this.sellerOrderItemRepository.findOne({
      where: { id: returnRequest.sellerOrderItemId },
    });
    const marketOrder = await this.marketOrderRepository.findOne({
      where: { id: order.orderId },
    });

    if (!item || !marketOrder?.paymentId) {
      returnRequest.status = ReturnStatus.REFUND_FAILED;
      returnRequest.refundError =
        'Paiement ou article introuvable pour cette commande : remboursement impossible automatiquement.';
      await this.repository.save(returnRequest);
      this.logger.error(
        `Return ${returnRequest.id}: cannot trigger refund (missing item or MarketOrder.paymentId)`,
      );
      await this.notifyOutcome(returnRequest);
      return;
    }

    const amount = Number(item.totalPrice);
    returnRequest.refundRequestedAt = new Date();

    try {
      const refund = await this.paymentApiClient.requestRefund({
        paymentId: marketOrder.paymentId,
        amount,
        reason: `Retour marketplace : ${returnRequest.reason}`.slice(0, 500),
        idempotencyKey: `return:${returnRequest.id}`,
      });

      returnRequest.refundId = refund.id;
      returnRequest.refundStatus = refund.status;
      returnRequest.refundError = null;

      if (refund.status === 'SUCCEEDED') {
        returnRequest.status = ReturnStatus.REFUNDED;
        order.status = SellerOrderStatus.REFUNDED;
        await this.sellerOrderRepository.save(order);
      }
      await this.repository.save(returnRequest);
      await this.notifyOutcome(returnRequest);
    } catch (error) {
      returnRequest.status = ReturnStatus.REFUND_FAILED;
      returnRequest.refundError =
        error instanceof Error ? error.message : String(error);
      await this.repository.save(returnRequest);
      this.logger.error(
        `Refund request failed for return ${returnRequest.id}: ${returnRequest.refundError}`,
      );
      await this.notifyOutcome(returnRequest);
    }
  }

  /**
   * Notifie le vendeur (canal interne, voir notifications/) et le membre
   * acheteur (best-effort via notifications) de l'issue courante du
   * retour. Jamais bloquant : un échec de notification ne doit jamais
   * remettre en cause l'état du retour lui-même.
   */
  private async notifyOutcome(returnRequest: ReturnRequest): Promise<void> {
    try {
      if (returnRequest.status === ReturnStatus.REFUNDED) {
        await this.notificationsService.notify(
          returnRequest.sellerId,
          NotificationType.RETURN_REFUNDED,
          'Retour remboursé',
          `Le retour de ${returnRequest.customerName} a été remboursé.`,
        );
      } else if (returnRequest.status === ReturnStatus.REFUND_FAILED) {
        await this.notificationsService.notify(
          returnRequest.sellerId,
          NotificationType.RETURN_REFUND_FAILED,
          'Échec du remboursement',
          `Le remboursement du retour de ${returnRequest.customerName} a échoué : ${returnRequest.refundError ?? 'raison inconnue'}.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Seller notification failed for return ${returnRequest.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const order = await this.sellerOrderRepository.findOne({
      where: { id: returnRequest.sellerOrderId },
    });
    const marketOrder = order
      ? await this.marketOrderRepository.findOne({
          where: { id: order.orderId },
        })
      : null;
    if (!marketOrder?.memberId) return;

    if (returnRequest.status === ReturnStatus.REFUNDED) {
      await this.notificationApiClient.notify({
        eventId: `return-refunded:${returnRequest.id}`,
        type: 'MARKET_RETURN_REFUNDED',
        userId: marketOrder.memberId,
        category: 'MARKET_RETURN_REFUNDED',
        title: 'Retour remboursé',
        body: `Votre retour sur la commande ${marketOrder.orderNumber} a été remboursé.`,
        data: { returnRequestId: returnRequest.id, orderId: marketOrder.id },
      });
    } else if (returnRequest.status === ReturnStatus.REFUND_FAILED) {
      await this.notificationApiClient.notify({
        eventId: `return-refund-failed:${returnRequest.id}`,
        type: 'MARKET_RETURN_REFUND_FAILED',
        userId: marketOrder.memberId,
        category: 'MARKET_RETURN_REFUND_FAILED',
        title: 'Remboursement en attente',
        body: `Le remboursement de votre retour sur la commande ${marketOrder.orderNumber} rencontre un problème et est en cours de traitement par nos équipes.`,
        data: { returnRequestId: returnRequest.id, orderId: marketOrder.id },
      });
    }
  }
}
