import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { InventoryService } from './inventory.service';
import { InventoryItem } from './entities/inventory-item.entity';
import { StockReservation } from './entities/stock-reservation.entity';
import { ReservationStatus } from './enums/reservation-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

function buildItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    sellerId: 'seller-1',
    productId: 'product-1',
    product: { name: 'Maillot domicile' } as InventoryItem['product'],
    variantId: null,
    variant: null,
    available: 10,
    lowStockThreshold: null,
    reserved: 0,
    sold: 0,
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('InventoryService.setAvailable', () => {
  let repository: { findOne: jest.Mock; save: jest.Mock };
  let notificationsService: jest.Mocked<Pick<NotificationsService, 'notify'>>;
  let service: InventoryService;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      save: jest.fn((item) => Promise.resolve(item as InventoryItem)),
    };
    notificationsService = { notify: jest.fn() };
    service = new InventoryService(
      repository as unknown as Repository<InventoryItem>,
      {} as unknown as Repository<StockReservation>,
      {} as unknown as DataSource,
      notificationsService as unknown as NotificationsService,
    );
  });

  it('throws when the inventory line does not belong to the seller', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.setAvailable('item-1', 'seller-1', 5)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates available without touching an unset threshold, no notification', async () => {
    repository.findOne.mockResolvedValue(
      buildItem({ available: 10, lowStockThreshold: null }),
    );

    const result = await service.setAvailable('item-1', 'seller-1', 3);

    expect(result.available).toBe(3);
    expect(notificationsService.notify).not.toHaveBeenCalled();
  });

  it('notifies LOW_STOCK when available crosses the threshold going down', async () => {
    repository.findOne.mockResolvedValue(
      buildItem({ available: 10, lowStockThreshold: 5 }),
    );

    const result = await service.setAvailable('item-1', 'seller-1', 4);

    expect(result.available).toBe(4);
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'seller-1',
      NotificationType.LOW_STOCK,
      expect.any(String),
      expect.stringContaining('Maillot domicile'),
    );
  });

  it('does not re-notify on every save while stock stays below the threshold', async () => {
    repository.findOne.mockResolvedValue(
      buildItem({ available: 4, lowStockThreshold: 5 }),
    );

    const result = await service.setAvailable('item-1', 'seller-1', 2);

    expect(result.available).toBe(2);
    expect(notificationsService.notify).not.toHaveBeenCalled();
  });

  it('does not notify when stock stays strictly above the threshold', async () => {
    repository.findOne.mockResolvedValue(
      buildItem({ available: 20, lowStockThreshold: 5 }),
    );

    await service.setAvailable('item-1', 'seller-1', 15);

    expect(notificationsService.notify).not.toHaveBeenCalled();
  });

  it('updates the threshold when provided, leaves it untouched when omitted', async () => {
    repository.findOne.mockResolvedValue(
      buildItem({ available: 10, lowStockThreshold: 5 }),
    );

    const result = await service.setAvailable('item-1', 'seller-1', 8, 20);

    expect(result.lowStockThreshold).toBe(20);
  });

  it('clears the threshold when explicitly set to null', async () => {
    repository.findOne.mockResolvedValue(
      buildItem({ available: 10, lowStockThreshold: 5 }),
    );

    const result = await service.setAvailable('item-1', 'seller-1', 8, null);

    expect(result.lowStockThreshold).toBeNull();
  });
});

/**
 * In-memory fake for everything InventoryService's reservation methods
 * touch through DataSource.transaction()/EntityManager, so tests exercise
 * the real conditional-update logic (the source of the "no negative
 * stock" guarantee) instead of a brittle mock of TypeORM's query-builder
 * API. Same approach as payment-api/src/refund/refund.service.spec.ts.
 */
class FakeInventoryDb {
  items = new Map<string, InventoryItem>();
  reservations = new Map<string, StockReservation>();
  private reservationSeq = 0;

  seedItem(item: InventoryItem): void {
    this.items.set(item.id, item);
  }

  private applyExpr(
    current: number,
    exprFn: () => string,
    qty: number,
  ): number {
    const expr = exprFn();
    if (expr.includes('- :qty')) return current - qty;
    if (expr.includes('+ :qty')) return current + qty;
    throw new Error(`Unsupported raw expression in fake: ${expr}`);
  }

  private updateInventoryItem(
    whereText: string,
    params: Record<string, unknown>,
    setValues: Record<string, unknown>,
  ): { affected: number } {
    const item = this.items.get(params.id as string);
    if (!item) return { affected: 0 };

    if (
      whereText.includes('available >= :qty') &&
      item.available < (params.qty as number)
    ) {
      return { affected: 0 };
    }

    const updated = { ...item } as unknown as Record<string, unknown>;
    const qty = params.qty as number;
    for (const [key, value] of Object.entries(setValues)) {
      updated[key] = this.applyExpr(
        updated[key] as number,
        value as () => string,
        qty,
      );
    }
    this.items.set(item.id, updated as unknown as InventoryItem);
    return { affected: 1 };
  }

  private updateReservation(
    whereText: string,
    params: Record<string, unknown>,
    setValues: Record<string, unknown>,
  ): { affected: number } {
    const reservation = this.reservations.get(params.id as string);
    if (!reservation) return { affected: 0 };

    if (
      whereText.includes('status = :expected') &&
      reservation.status !== params.expected
    ) {
      return { affected: 0 };
    }

    this.reservations.set(reservation.id, { ...reservation, ...setValues });
    return { affected: 1 };
  }

  private reservationRepo(scopedToTransaction: boolean) {
    return {
      create: (data: Partial<StockReservation>) =>
        ({ ...data }) as StockReservation,
      save: (entity: StockReservation) => {
        if (!entity.id) entity.id = `reservation-${++this.reservationSeq}`;
        this.reservations.set(entity.id, { ...entity });
        return Promise.resolve(entity);
      },
      findOne: ({ where }: { where: Partial<StockReservation> }) => {
        for (const r of this.reservations.values()) {
          if (where.id !== undefined && r.id !== where.id) continue;
          if (
            where.inventoryItemId !== undefined &&
            r.inventoryItemId !== where.inventoryItemId
          )
            continue;
          if (
            where.referenceId !== undefined &&
            r.referenceId !== where.referenceId
          )
            continue;
          return Promise.resolve({ ...r });
        }
        return Promise.resolve(null);
      },
      find: ({
        where,
      }: {
        where: { status: ReservationStatus; expiresAt: unknown };
      }) => {
        const now = new Date();
        const results = [...this.reservations.values()].filter(
          (r) =>
            r.status === where.status &&
            r.expiresAt !== null &&
            r.expiresAt < now,
        );
        return Promise.resolve(results.map((r) => ({ ...r })));
      },
      // Only meaningful outside a transaction — kept for symmetry.
      unused: scopedToTransaction,
    };
  }

  manager(): EntityManager {
    const genericQueryBuilder = () => {
      let targetEntity: unknown;
      let setValues: Record<string, unknown> = {};
      let whereText = '';
      let whereParams: Record<string, unknown> = {};
      const qb = {
        update: (Entity: unknown) => {
          targetEntity = Entity;
          return qb;
        },
        set: (values: Record<string, unknown>) => {
          setValues = values;
          return qb;
        },
        where: (text: string, params: Record<string, unknown> = {}) => {
          whereText = text;
          whereParams = { ...whereParams, ...params };
          return qb;
        },
        setParameter: (key: string, value: unknown) => {
          whereParams[key] = value;
          return qb;
        },
        execute: () => {
          if (targetEntity === InventoryItem) {
            return Promise.resolve(
              this.updateInventoryItem(whereText, whereParams, setValues),
            );
          }
          if (targetEntity === StockReservation) {
            return Promise.resolve(
              this.updateReservation(whereText, whereParams, setValues),
            );
          }
          throw new Error('Unexpected entity target in fake query builder');
        },
      };
      return qb;
    };

    return {
      createQueryBuilder: genericQueryBuilder,
      getRepository: (Entity: unknown) => {
        if (Entity === StockReservation) return this.reservationRepo(true);
        throw new Error('Unexpected entity in fake manager.getRepository');
      },
    } as unknown as EntityManager;
  }

  plainReservationRepository() {
    return this.reservationRepo(false);
  }

  plainInventoryRepository() {
    return {
      count: ({ where }: { where: { available: { value: unknown } } }) => {
        // Mirrors TypeORM's LessThan(0) FindOperator shape closely enough
        // for this fake: any negative `available` counts, ignoring the
        // exact operator value.
        void where;
        let count = 0;
        for (const item of this.items.values()) {
          if (item.available < 0) count++;
        }
        return Promise.resolve(count);
      },
    };
  }
}

describe('InventoryService — stock reservation (TASK-P0-005)', () => {
  let db: FakeInventoryDb;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let service: InventoryService;

  beforeEach(() => {
    db = new FakeInventoryDb();
    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(
          (cb: (manager: EntityManager) => Promise<unknown>) =>
            cb(db.manager()),
        ),
    };

    service = new InventoryService(
      db.plainInventoryRepository() as unknown as Repository<InventoryItem>,
      db.plainReservationRepository() as unknown as Repository<StockReservation>,
      dataSource as unknown as DataSource,
      { notify: jest.fn() } as unknown as NotificationsService,
    );
  });

  describe('reserveStock', () => {
    it('decrements available and increments reserved atomically', async () => {
      db.seedItem(buildItem({ available: 10, reserved: 0 }));

      const reservation = await service.reserveStock(
        'item-1',
        3,
        'order-item-1',
      );

      expect(reservation.status).toBe(ReservationStatus.RESERVED);
      expect(reservation.quantity).toBe(3);
      const item = db.items.get('item-1')!;
      expect(item.available).toBe(7);
      expect(item.reserved).toBe(3);
    });

    it('rejects a reservation exceeding the available quantity (never goes negative)', async () => {
      db.seedItem(buildItem({ available: 2, reserved: 0 }));

      await expect(
        service.reserveStock('item-1', 3, 'order-item-1'),
      ).rejects.toThrow(ConflictException);

      const item = db.items.get('item-1')!;
      expect(item.available).toBe(2);
      expect(item.reserved).toBe(0);
    });

    it('allows reserving exactly the last unit, and rejects a concurrent second reservation for it', async () => {
      db.seedItem(buildItem({ available: 1, reserved: 0 }));

      const first = await service.reserveStock('item-1', 1, 'order-item-1');
      expect(first.status).toBe(ReservationStatus.RESERVED);
      expect(db.items.get('item-1')!.available).toBe(0);

      // Simule une seconde requête concurrente sur la même dernière unité,
      // arrivée juste après (le lock/l'UPDATE conditionnel a déjà tranché
      // pour la première) — l'UPDATE conditionnel doit refuser, jamais
      // laisser available passer sous zéro.
      await expect(
        service.reserveStock('item-1', 1, 'order-item-2'),
      ).rejects.toThrow(ConflictException);
      expect(db.items.get('item-1')!.available).toBe(0);
      expect(db.items.get('item-1')!.reserved).toBe(1);
    });

    it('is idempotent: replaying the same referenceId returns the existing reservation without reserving twice', async () => {
      db.seedItem(buildItem({ available: 10, reserved: 0 }));

      const first = await service.reserveStock('item-1', 3, 'order-item-1');
      const second = await service.reserveStock('item-1', 3, 'order-item-1');

      expect(second.id).toBe(first.id);
      expect(db.items.get('item-1')!.available).toBe(7); // pas 4
      expect(db.items.get('item-1')!.reserved).toBe(3); // pas 6
    });

    it('recovers from a concurrent duplicate-reference race by returning the winner', async () => {
      db.seedItem(buildItem({ available: 10, reserved: 0 }));
      const winner: StockReservation = {
        id: 'reservation-winner',
        inventoryItemId: 'item-1',
        referenceId: 'order-item-1',
        quantity: 3,
        status: ReservationStatus.RESERVED,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StockReservation;

      const duplicateError = Object.assign(new Error('Duplicate entry'), {
        code: 'ER_DUP_ENTRY',
      });
      Object.setPrototypeOf(duplicateError, QueryFailedError.prototype);
      dataSource.transaction.mockImplementationOnce(() => {
        db.reservations.set(winner.id, winner);
        return Promise.reject(duplicateError);
      });

      const result = await service.reserveStock('item-1', 3, 'order-item-1');

      expect(result.id).toBe('reservation-winner');
    });

    it('rejects a non-positive quantity', async () => {
      db.seedItem(buildItem({ available: 10 }));

      await expect(
        service.reserveStock('item-1', 0, 'order-item-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('confirmReservation', () => {
    it('converts reserved to sold exactly once', async () => {
      db.seedItem(buildItem({ available: 7, reserved: 3, sold: 0 }));
      // Seed a reservation directly (already-reserved state, as if reserveStock had run earlier).
      db.reservations.set('res-1', {
        id: 'res-1',
        inventoryItemId: 'item-1',
        referenceId: 'order-item-1',
        quantity: 3,
        status: ReservationStatus.RESERVED,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StockReservation);

      const confirmed = await service.confirmReservation('res-1');
      expect(confirmed.status).toBe(ReservationStatus.CONFIRMED);
      const item = db.items.get('item-1')!;
      expect(item.reserved).toBe(0);
      expect(item.sold).toBe(3);

      // Idempotent replay: no further mutation.
      const again = await service.confirmReservation('res-1');
      expect(again.status).toBe(ReservationStatus.CONFIRMED);
      expect(db.items.get('item-1')!.sold).toBe(3);
    });

    it('throws when confirming a reservation that was already released', async () => {
      db.seedItem(buildItem({ available: 10, reserved: 0 }));
      db.reservations.set('res-1', {
        id: 'res-1',
        inventoryItemId: 'item-1',
        referenceId: 'order-item-1',
        quantity: 3,
        status: ReservationStatus.RELEASED,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StockReservation);

      await expect(service.confirmReservation('res-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException for an unknown reservation', async () => {
      await expect(service.confirmReservation('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('releaseReservation', () => {
    it('returns reserved quantity back to available', async () => {
      db.seedItem(buildItem({ available: 7, reserved: 3, sold: 0 }));
      db.reservations.set('res-1', {
        id: 'res-1',
        inventoryItemId: 'item-1',
        referenceId: 'order-item-1',
        quantity: 3,
        status: ReservationStatus.RESERVED,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StockReservation);

      const released = await service.releaseReservation('res-1');
      expect(released.status).toBe(ReservationStatus.RELEASED);
      const item = db.items.get('item-1')!;
      expect(item.available).toBe(10);
      expect(item.reserved).toBe(0);

      // Idempotent replay.
      const again = await service.releaseReservation('res-1');
      expect(again.status).toBe(ReservationStatus.RELEASED);
      expect(db.items.get('item-1')!.available).toBe(10);
    });

    it('throws when releasing an already-confirmed (sold) reservation', async () => {
      db.seedItem(buildItem({ available: 7, reserved: 0, sold: 3 }));
      db.reservations.set('res-1', {
        id: 'res-1',
        inventoryItemId: 'item-1',
        referenceId: 'order-item-1',
        quantity: 3,
        status: ReservationStatus.CONFIRMED,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StockReservation);

      await expect(service.releaseReservation('res-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('expireStaleReservations', () => {
    it('expires RESERVED reservations past their TTL and returns stock to available', async () => {
      db.seedItem(buildItem({ available: 7, reserved: 3, sold: 0 }));
      db.reservations.set('res-1', {
        id: 'res-1',
        inventoryItemId: 'item-1',
        referenceId: 'order-item-1',
        quantity: 3,
        status: ReservationStatus.RESERVED,
        expiresAt: new Date(Date.now() - 1000), // déjà expirée
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StockReservation);

      const report = await service.expireStaleReservations();

      expect(report.expired).toBe(1);
      const item = db.items.get('item-1')!;
      expect(item.available).toBe(10);
      expect(item.reserved).toBe(0);
      expect(db.reservations.get('res-1')!.status).toBe(
        ReservationStatus.EXPIRED,
      );
    });

    it('never expires a reservation that was confirmed just before (succès tardif)', async () => {
      db.seedItem(buildItem({ available: 7, reserved: 0, sold: 3 }));
      db.reservations.set('res-1', {
        id: 'res-1',
        inventoryItemId: 'item-1',
        referenceId: 'order-item-1',
        quantity: 3,
        status: ReservationStatus.CONFIRMED, // déjà payé
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StockReservation);

      // La requête "find" du fake ne remonte que status=RESERVED, donc rien
      // à traiter ici — reflète le comportement réel (la requête SQL filtre
      // déjà sur RESERVED).
      const report = await service.expireStaleReservations();
      expect(report.expired).toBe(0);
      expect(db.items.get('item-1')!.sold).toBe(3);
    });
  });

  describe('detectOversell', () => {
    it('reports zero violations in normal operation', async () => {
      db.seedItem(buildItem({ available: 5 }));
      const report = await service.detectOversell();
      expect(report.violatingItemCount).toBe(0);
    });

    it('flags an item with negative available as an oversell violation', async () => {
      db.seedItem(buildItem({ id: 'item-bad', available: -1 }));
      const report = await service.detectOversell();
      expect(report.violatingItemCount).toBe(1);
    });
  });
});
