import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  LessThan,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { StockReservation } from './entities/stock-reservation.entity';
import { ReservationStatus } from './enums/reservation-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

// Alignée sur le TTL de réservation panier de billetterie/teamManager
// (PENDING_RESERVATION_TTL_MS / PENDING_ORDER_TTL_MS) — même raisonnement :
// au-delà, une réservation sans paiement confirmé est considérée abandonnée.
const DEFAULT_RESERVATION_TTL_MS = 30 * 60 * 1000;

export interface OversellReport {
  /** Toujours 0 en fonctionnement normal — voir reserveStock. */
  violatingItemCount: number;
  timestamp: string;
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly repository: Repository<InventoryItem>,
    @InjectRepository(StockReservation)
    private readonly reservationRepository: Repository<StockReservation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
   * jamais `reserved`/`sold`, dérivés du traitement des commandes (voir
   * reserveStock/confirmReservation/releaseReservation ci-dessous).
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

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error as unknown as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }

  /**
   * TASK-P0-005 (todo.md). Réserve `quantity` unités d'`inventoryItemId` au
   * nom de `referenceId` (opaque — un SellerOrderItem.id une fois
   * TASK-P0-004 construit ; jamais interprété ici). Transactionnelle et
   * conditionnelle : l'UPDATE SQL lui-même (`available >= :qty`), pas
   * seulement une lecture préalable, empêche tout stock négatif même sous
   * requêtes concurrentes sur la dernière unité — même pattern que
   * l'achat de billet (billetterie/src/lib/tickets.ts, purchaseTickets).
   *
   * Idempotente par (inventoryItemId, referenceId) : rejouer cet appel
   * (retry réseau, double clic) renvoie la réservation déjà créée plutôt
   * que d'en tenter une seconde ou d'échouer.
   */
  async reserveStock(
    inventoryItemId: string,
    quantity: number,
    referenceId: string,
    ttlMs: number = DEFAULT_RESERVATION_TTL_MS,
  ): Promise<StockReservation> {
    const existing = await this.reservationRepository.findOne({
      where: { inventoryItemId, referenceId },
    });
    if (existing) return existing;

    try {
      return await this.dataSource.transaction((manager) =>
        this.reserveStockWithManager(
          manager,
          inventoryItemId,
          quantity,
          referenceId,
          ttlMs,
        ),
      );
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        const raced = await this.reservationRepository.findOne({
          where: { inventoryItemId, referenceId },
        });
        if (raced) return raced;
      }
      throw error;
    }
  }

  /**
   * Cœur transactionnel de reserveStock, accepte un EntityManager déjà
   * ouvert — utilisé directement par CheckoutService (TASK-P0-004) pour
   * que la création de commande et toutes ses réservations de stock
   * committent/rollback ensemble, jamais partiellement. `reserveStock`
   * ci-dessus n'est qu'un appelant parmi d'autres, avec sa propre
   * transaction, pour un usage autonome (tests, appel isolé).
   *
   * Ne fait PAS le contrôle d'idempotence par (inventoryItemId,
   * referenceId) : à la charge de l'appelant transactionnel (une seule
   * lecture cohérente en dehors de la transaction suffit pour
   * CheckoutService, qui ne réutilise jamais un referenceId).
   */
  async reserveStockWithManager(
    manager: EntityManager,
    inventoryItemId: string,
    quantity: number,
    referenceId: string,
    ttlMs: number = DEFAULT_RESERVATION_TTL_MS,
  ): Promise<StockReservation> {
    if (quantity <= 0) {
      throw new ConflictException('La quantité réservée doit être positive.');
    }

    const updateResult = await manager
      .createQueryBuilder()
      .update(InventoryItem)
      .set({
        available: () => 'available - :qty',
        reserved: () => 'reserved + :qty',
      })
      .where('id = :id AND available >= :qty', {
        id: inventoryItemId,
        qty: quantity,
      })
      .execute();

    if (updateResult.affected !== 1) {
      throw new ConflictException(
        'Stock insuffisant pour réserver cette quantité.',
      );
    }

    const reservation = manager.getRepository(StockReservation).create({
      inventoryItemId,
      referenceId,
      quantity,
      status: ReservationStatus.RESERVED,
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return manager.getRepository(StockReservation).save(reservation);
  }

  /**
   * TASK-P0-005. `reserved` -> `sold`, exactement une fois (UPDATE
   * conditionnel sur `status = RESERVED`, comme le passage PAID de
   * payment-api). Idempotente : confirmer une réservation déjà CONFIRMED
   * est un no-op qui renvoie l'état actuel. Lève si la réservation a déjà
   * été relâchée/expirée : un paiement confirmé sur du stock qui n'est
   * plus tenu doit être traité comme une incohérence explicite (voir
   * TASK-P0-002/todo.md pour l'équivalent billetterie/teamManager), jamais
   * silencieusement ignoré.
   */
  async confirmReservation(reservationId: string): Promise<StockReservation> {
    return this.dataSource.transaction((manager) =>
      this.confirmReservationWithManager(manager, reservationId),
    );
  }

  /** Cœur transactionnel de confirmReservation — voir reserveStockWithManager pour pourquoi CheckoutService (TASK-P0-004) en a besoin. */
  async confirmReservationWithManager(
    manager: EntityManager,
    reservationId: string,
  ): Promise<StockReservation> {
    const repo = manager.getRepository(StockReservation);
    const reservation = await repo.findOne({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Réservation introuvable.');
    if (reservation.status === ReservationStatus.CONFIRMED) return reservation;
    if (reservation.status !== ReservationStatus.RESERVED) {
      throw new ConflictException(
        `Impossible de confirmer une réservation au statut ${reservation.status}.`,
      );
    }

    const updateResult = await manager
      .createQueryBuilder()
      .update(StockReservation)
      .set({ status: ReservationStatus.CONFIRMED })
      .where('id = :id AND status = :expected', {
        id: reservationId,
        expected: ReservationStatus.RESERVED,
      })
      .execute();

    if (updateResult.affected !== 1) {
      const reloaded = await repo.findOne({ where: { id: reservationId } });
      if (reloaded?.status === ReservationStatus.CONFIRMED) return reloaded;
      throw new ConflictException(
        'La réservation a changé de statut entre-temps.',
      );
    }

    await manager
      .createQueryBuilder()
      .update(InventoryItem)
      .set({
        reserved: () => 'reserved - :qty',
        sold: () => 'sold + :qty',
      })
      .where('id = :id', { id: reservation.inventoryItemId })
      .setParameter('qty', reservation.quantity)
      .execute();

    reservation.status = ReservationStatus.CONFIRMED;
    return reservation;
  }

  /** TASK-P0-005. Relâche une réservation avant paiement (annulation, échec) : `reserved` -> `available`. Idempotente. */
  async releaseReservation(reservationId: string): Promise<StockReservation> {
    return this.dataSource.transaction((manager) =>
      this.resolveReservationWithManager(
        manager,
        reservationId,
        ReservationStatus.RELEASED,
      ),
    );
  }

  /** Cœur transactionnel de releaseReservation — voir reserveStockWithManager. */
  async releaseReservationWithManager(
    manager: EntityManager,
    reservationId: string,
  ): Promise<StockReservation> {
    return this.resolveReservationWithManager(
      manager,
      reservationId,
      ReservationStatus.RELEASED,
    );
  }

  private async resolveReservation(
    reservationId: string,
    finalStatus: ReservationStatus.RELEASED | ReservationStatus.EXPIRED,
  ): Promise<StockReservation> {
    return this.dataSource.transaction((manager) =>
      this.resolveReservationWithManager(manager, reservationId, finalStatus),
    );
  }

  private async resolveReservationWithManager(
    manager: EntityManager,
    reservationId: string,
    finalStatus: ReservationStatus.RELEASED | ReservationStatus.EXPIRED,
  ): Promise<StockReservation> {
    const repo = manager.getRepository(StockReservation);
    const reservation = await repo.findOne({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Réservation introuvable.');
    if (reservation.status === finalStatus) return reservation;
    if (reservation.status !== ReservationStatus.RESERVED) {
      throw new ConflictException(
        `Impossible de relâcher une réservation au statut ${reservation.status}.`,
      );
    }

    const updateResult = await manager
      .createQueryBuilder()
      .update(StockReservation)
      .set({ status: finalStatus })
      .where('id = :id AND status = :expected', {
        id: reservationId,
        expected: ReservationStatus.RESERVED,
      })
      .execute();

    if (updateResult.affected !== 1) {
      const reloaded = await repo.findOne({ where: { id: reservationId } });
      if (reloaded && reloaded.status !== ReservationStatus.RESERVED) {
        return reloaded;
      }
      throw new ConflictException(
        'La réservation a changé de statut entre-temps.',
      );
    }

    await manager
      .createQueryBuilder()
      .update(InventoryItem)
      .set({
        reserved: () => 'reserved - :qty',
        available: () => 'available + :qty',
      })
      .where('id = :id', { id: reservation.inventoryItemId })
      .setParameter('qty', reservation.quantity)
      .execute();

    reservation.status = finalStatus;
    return reservation;
  }

  /**
   * TASK-P0-005. Relâche automatiquement les réservations RESERVED dont le
   * TTL est dépassé — voir CheckoutReconciliationService (TASK-P0-004) pour
   * le scheduler qui l'appelle périodiquement. Un échec de résolution
   * individuel (course avec une confirmation/relâche concurrente entre la
   * lecture et l'appel) n'interrompt jamais le lot : une réservation de
   * moins à expirer, pas une erreur à propager.
   */
  async expireStaleReservations(): Promise<{ expired: number }> {
    const now = new Date();
    const stale = await this.reservationRepository.find({
      where: { status: ReservationStatus.RESERVED, expiresAt: LessThan(now) },
      take: 200,
    });

    let expired = 0;
    for (const reservation of stale) {
      try {
        await this.resolveReservation(
          reservation.id,
          ReservationStatus.EXPIRED,
        );
        expired++;
      } catch {
        // Résolue entre-temps par un autre appelant (paiement confirmé
        // juste avant l'expiration, par ex.) — pas une erreur.
      }
    }

    return { expired };
  }

  /**
   * TASK-P0-005 — "métrique d'oversell avec cible zéro". `available` ne
   * devrait jamais pouvoir passer sous zéro grâce à l'UPDATE conditionnel
   * de reserveStock ; ce compteur est une sonde défensive (bug, édition
   * manuelle en base) plutôt qu'un chemin attendu — voir
   * InventoryHealthController.
   */
  async detectOversell(): Promise<OversellReport> {
    const violatingItemCount = await this.repository.count({
      where: { available: LessThan(0) },
    });
    return { violatingItemCount, timestamp: new Date().toISOString() };
  }
}
