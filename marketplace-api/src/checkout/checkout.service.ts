import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { MarketOrder } from '../orders/entities/market-order.entity';
import { MarketOrderStatus } from '../orders/enums/market-order-status.enum';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { SellerOrderItem } from '../seller-orders/entities/seller-order-item.entity';
import { SellerOrderStatus } from '../seller-orders/enums/seller-order-status.enum';
import { CartItem } from '../cart/entities/cart-item.entity';
import { CartService } from '../cart/cart.service';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/enums/product-status.enum';
import { ProductVariant } from '../variants/entities/product-variant.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { NotificationApiClientService } from './notification-api-client.service';
import { PaymentApiClientService } from './payment-api-client.service';
import { CheckoutDto } from './dto/checkout.dto';

export interface CheckoutResult {
  order: MarketOrder;
  payUrl: string | null;
}

interface RevalidatedLine {
  product: Product;
  variant: ProductVariant | null;
  inventoryItem: InventoryItem;
  quantity: number;
  unitPrice: number;
}

/**
 * TASK-P0-004 (todo.md). Construit le tunnel de commande absent (voir
 * l'ancien commentaire "hors périmètre" sur OrdersService/SellerOrdersService).
 * Toute la revalidation (prix, statut publié, vendeur, stock) et la
 * réservation de stock (TASK-P0-005) se produisent dans UNE transaction —
 * soit la commande et toutes ses réservations existent ensemble, soit
 * aucune. Le paiement lui-même s'initie hors transaction (appel réseau vers
 * payment-api) ; un échec compense explicitement (annule la commande,
 * relâche le stock) plutôt que de laisser une commande orpheline.
 */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(MarketOrder)
    private readonly orderRepository: Repository<MarketOrder>,
    @InjectRepository(SellerOrder)
    private readonly sellerOrderRepository: Repository<SellerOrder>,
    @InjectRepository(SellerOrderItem)
    private readonly sellerOrderItemRepository: Repository<SellerOrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepository: Repository<InventoryItem>,
    private readonly cartService: CartService,
    private readonly inventoryService: InventoryService,
    private readonly paymentApiClient: PaymentApiClientService,
    private readonly notificationApiClient: NotificationApiClientService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkout(
    memberId: string,
    dto: CheckoutDto,
    idempotencyKey?: string,
  ): Promise<CheckoutResult> {
    if (idempotencyKey) {
      const existing = await this.orderRepository.findOne({
        where: { memberId, idempotencyKey },
      });
      if (existing) {
        this.logger.log(
          `Idempotent checkout replay for member ${memberId}: order ${existing.id}.`,
        );
        return this.resumePayment(existing, dto);
      }
    }

    const provider = this.paymentApiClient.getProvider();
    if (
      provider === 'paymee' &&
      (!dto.firstName || !dto.lastName || !dto.customerPhone)
    ) {
      throw new BadRequestException(
        'Prénom, nom et téléphone sont requis pour payer par Paymee.',
      );
    }

    const cartItems = await this.cartService.viewCart(memberId);
    if (cartItems.length === 0) {
      throw new BadRequestException('Le panier est vide.');
    }

    const lines = await this.revalidateLines(cartItems);
    const order = await this.createOrderWithReservations(
      memberId,
      dto,
      idempotencyKey,
      lines,
    );
    await this.cartService.clearCart(memberId);

    return this.initiatePaymentOrCompensate(order, memberId, dto);
  }

  /**
   * Rejoue une demande de checkout déjà traitée (retry réseau, double clic)
   * — la commande existe déjà, seule l'initiation de paiement est
   * re-tentée (elle-même idempotente côté payment-api par la même clé).
   */
  private async resumePayment(
    order: MarketOrder,
    dto: CheckoutDto,
  ): Promise<CheckoutResult> {
    if (order.status !== MarketOrderStatus.PENDING) {
      return { order, payUrl: null };
    }
    return this.initiatePaymentOrCompensate(order, order.memberId!, dto);
  }

  private async initiatePaymentOrCompensate(
    order: MarketOrder,
    memberId: string,
    dto: CheckoutDto,
  ): Promise<CheckoutResult> {
    try {
      const initiated = await this.paymentApiClient.initPayment({
        orderId: order.orderNumber,
        amount: Number(order.totalAmount),
        email: order.customerEmail,
        userId: memberId,
        idempotencyKey: order.idempotencyKey ?? order.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: order.customerPhone ?? undefined,
      });
      await this.orderRepository.update(order.id, {
        paymentId: initiated.paymentId,
      });
      return {
        order: { ...order, paymentId: initiated.paymentId },
        payUrl: initiated.payUrl,
      };
    } catch (error) {
      this.logger.error(
        `Payment initiation failed for order ${order.id}, cancelling and releasing reserved stock.`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.cancelOrder(order.id, "Échec d'initiation du paiement.");
      throw error;
    }
  }

  /**
   * Prix, statut publié, vendeur et stock relus depuis la base au moment du
   * checkout — jamais fait confiance au panier, qui peut dater de plusieurs
   * minutes ou heures.
   */
  private async revalidateLines(
    cartItems: CartItem[],
  ): Promise<RevalidatedLine[]> {
    const lines: RevalidatedLine[] = [];

    for (const item of cartItems) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId, deletedAt: IsNull() },
      });
      if (!product) {
        throw new ConflictException(
          `Un produit de votre panier n'est plus disponible.`,
        );
      }
      if (product.status !== ProductStatus.PUBLISHED || !product.isActive) {
        throw new ConflictException(`"${product.name}" n'est plus en vente.`);
      }

      let variant: ProductVariant | null = null;
      if (item.variantId) {
        variant = await this.variantRepository.findOne({
          where: { id: item.variantId, productId: product.id },
        });
        if (!variant || !variant.isActive) {
          throw new ConflictException(
            `Une variante de "${product.name}" n'est plus disponible.`,
          );
        }
      }

      const inventoryItem = await this.inventoryRepository.findOne({
        where: {
          productId: product.id,
          variantId: item.variantId ?? IsNull(),
        },
      });
      if (!inventoryItem) {
        throw new ConflictException(
          `Le stock de "${product.name}" n'est pas configuré.`,
        );
      }

      lines.push({
        product,
        variant,
        inventoryItem,
        quantity: item.quantity,
        unitPrice: Number(variant?.price ?? product.price),
      });
    }

    return lines;
  }

  /**
   * Crée MarketOrder + une SellerOrder par vendeur impliqué + leurs
   * SellerOrderItem (snapshot immuable), puis réserve le stock de chaque
   * ligne (TASK-P0-005) — tout dans une seule transaction : si une seule
   * réservation échoue (stock épuisé entre l'affichage du panier et le
   * checkout), toute la commande est annulée, y compris les réservations
   * déjà faites pour d'autres vendeurs dans ce même checkout.
   */
  private async createOrderWithReservations(
    memberId: string,
    dto: CheckoutDto,
    idempotencyKey: string | undefined,
    lines: RevalidatedLine[],
  ): Promise<MarketOrder> {
    const bySeller = new Map<string, RevalidatedLine[]>();
    for (const line of lines) {
      const list = bySeller.get(line.product.sellerId) ?? [];
      list.push(line);
      bySeller.set(line.product.sellerId, list);
    }
    // Ordre de verrouillage stable entre checkouts concurrents touchant les
    // mêmes vendeurs — évite les deadlocks (même raisonnement que
    // ShopOrderService.createOrder côté teamManager).
    const sellerIds = Array.from(bySeller.keys()).sort();

    return this.dataSource.transaction(async (manager) => {
      const order = manager.getRepository(MarketOrder).create({
        orderNumber: `MO-${randomUUID().slice(0, 8).toUpperCase()}`,
        memberId,
        idempotencyKey: idempotencyKey ?? null,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone ?? null,
        shippingAddress: dto.shippingAddress,
        totalAmount: '0.000',
        status: MarketOrderStatus.PENDING,
        paymentId: null,
      });
      await manager.getRepository(MarketOrder).save(order);

      let grandTotal = 0;

      for (const sellerId of sellerIds) {
        const sellerLines = bySeller.get(sellerId)!;
        const seller = await manager
          .getRepository(Seller)
          .findOne({ where: { id: sellerId } });
        if (!seller) {
          throw new ConflictException(
            "Un des vendeurs de ce panier n'est plus disponible.",
          );
        }

        let subtotal = 0;
        const items = sellerLines.map((line) => {
          const lineTotal = line.unitPrice * line.quantity;
          subtotal += lineTotal;
          return manager.getRepository(SellerOrderItem).create({
            sellerOrderId: '',
            productId: line.product.id,
            variantId: line.variant?.id ?? null,
            productName: line.product.name,
            sku: line.variant?.sku ?? line.product.sku,
            quantity: line.quantity,
            unitPrice: line.unitPrice.toFixed(3),
            totalPrice: lineTotal.toFixed(3),
            reservationId: null,
          });
        });

        const commissionRate = Number(seller.commissionRate);
        const commissionAmount = (subtotal * commissionRate) / 100;
        const netAmount = subtotal - commissionAmount;

        const sellerOrder = manager.getRepository(SellerOrder).create({
          orderId: order.id,
          sellerId,
          status: SellerOrderStatus.PENDING,
          subtotal: subtotal.toFixed(3),
          commissionRate: commissionRate.toFixed(2),
          commissionAmount: commissionAmount.toFixed(3),
          netAmount: netAmount.toFixed(3),
        });
        await manager.getRepository(SellerOrder).save(sellerOrder);

        for (const item of items) item.sellerOrderId = sellerOrder.id;
        await manager.getRepository(SellerOrderItem).save(items);

        for (let i = 0; i < items.length; i++) {
          const reservation =
            await this.inventoryService.reserveStockWithManager(
              manager,
              sellerLines[i].inventoryItem.id,
              sellerLines[i].quantity,
              items[i].id,
            );
          items[i].reservationId = reservation.id;
        }
        await manager.getRepository(SellerOrderItem).save(items);

        grandTotal += subtotal;
      }

      order.totalAmount = grandTotal.toFixed(3);
      await manager.getRepository(MarketOrder).update(order.id, {
        totalAmount: order.totalAmount,
      });

      return order;
    });
  }

  /**
   * Annule une commande PENDING (paiement jamais confirmé) : relâche
   * chaque réservation de stock et marque commande + sous-commandes
   * CANCELLED. Idempotente au niveau de chaque réservation (voir
   * InventoryService.releaseReservation) — rejouer sur une commande déjà
   * CANCELLED est un no-op sûr.
   */
  async cancelOrder(orderId: string, reason: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order || order.status !== MarketOrderStatus.PENDING) return;

    const sellerOrders = await this.sellerOrderRepository.find({
      where: { orderId },
    });

    for (const sellerOrder of sellerOrders) {
      const items = await this.sellerOrderItemRepository.find({
        where: { sellerOrderId: sellerOrder.id },
      });
      for (const item of items) {
        if (!item.reservationId) continue;
        try {
          await this.inventoryService.releaseReservation(item.reservationId);
        } catch (error) {
          this.logger.error(
            `Failed to release reservation ${item.reservationId} for cancelled order ${orderId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
      await this.sellerOrderRepository.update(sellerOrder.id, {
        status: SellerOrderStatus.CANCELLED,
      });
    }

    await this.orderRepository.update(orderId, {
      status: MarketOrderStatus.CANCELLED,
    });

    this.logger.log(`Order ${orderId} cancelled: ${reason}`);

    if (order.memberId) {
      await this.notificationApiClient.notify({
        eventId: `market-order-cancelled:${orderId}`,
        type: 'MARKET_ORDER_CANCELLED',
        userId: order.memberId,
        category: 'MARKET_ORDER_CANCELLED',
        title: 'Commande annulée',
        body: `Votre commande ${order.orderNumber} a été annulée : ${reason}`,
        data: { orderId, orderNumber: order.orderNumber },
      });
    }
  }

  /**
   * Confirme une commande payée : chaque SellerOrder passe PENDING ->
   * CONFIRMED, chaque réservation reserved -> sold (TASK-P0-005), et les
   * vendeurs/le membre sont notifiés. Idempotente : appelée plusieurs fois
   * (rejeu webhook) ne confirme jamais deux fois — voir
   * CheckoutController/le webhook payment-api.
   */
  async confirmOrder(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) return;
    if (order.status === MarketOrderStatus.PAID) return; // déjà traité

    const sellerOrders = await this.sellerOrderRepository.find({
      where: { orderId },
    });

    for (const sellerOrder of sellerOrders) {
      if (sellerOrder.status === SellerOrderStatus.PENDING) {
        const items = await this.sellerOrderItemRepository.find({
          where: { sellerOrderId: sellerOrder.id },
        });
        for (const item of items) {
          if (item.reservationId) {
            await this.inventoryService.confirmReservation(item.reservationId);
          }
        }
        await this.sellerOrderRepository.update(sellerOrder.id, {
          status: SellerOrderStatus.CONFIRMED,
        });
        await this.notificationsService.notify(
          sellerOrder.sellerId,
          NotificationType.NEW_ORDER,
          'Nouvelle commande',
          `Une nouvelle commande de ${sellerOrder.subtotal} TND a été payée et attend préparation.`,
        );
      }
    }

    await this.orderRepository.update(orderId, {
      status: MarketOrderStatus.PAID,
    });

    if (order.memberId) {
      await this.notificationApiClient.notify({
        eventId: `market-order-paid:${orderId}`,
        type: 'MARKET_ORDER_CONFIRMED',
        userId: order.memberId,
        category: 'MARKET_ORDER_CONFIRMED',
        title: 'Commande confirmée',
        body: `Votre commande ${order.orderNumber} est confirmée, les vendeurs vont la préparer.`,
        data: { orderId, orderNumber: order.orderNumber },
      });
    }
  }

  /**
   * payment-api ne rappelle jamais directement CheckoutService : c'est à
   * marketplace-api de relire son statut, soit via le webhook applicatif
   * signé (CheckoutController), soit via le scheduler de réconciliation
   * (CheckoutReconciliationService) — même stratégie que
   * billetterie/src/lib/tickets.ts#reconcileTicketPayment. Idempotente :
   * confirmOrder/cancelOrder no-opent déjà sur une commande non-PENDING.
   */
  async reconcilePaymentStatus(paymentId: string): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { paymentId } });
    if (!order) return; // paymentId d'une autre application, rien à faire ici
    if (order.status !== MarketOrderStatus.PENDING) return;

    const status = await this.paymentApiClient.getPaymentStatus(paymentId);
    if (status === 'PAID') {
      await this.confirmOrder(order.id);
    } else if (status === 'FAILED' || status === 'EXPIRED') {
      await this.cancelOrder(order.id, `Paiement ${status}.`);
    }
  }
}
