import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CheckoutService } from './checkout.service';
import { PaymentApiClientService } from './payment-api-client.service';
import { NotificationApiClientService } from './notification-api-client.service';
import { CartService } from '../cart/cart.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/enums/product-status.enum';
import { ProductVariant } from '../variants/entities/product-variant.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { SellerStatus } from '../sellers/enums/seller-status.enum';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { StockReservation } from '../inventory/entities/stock-reservation.entity';
import { MarketOrder } from '../orders/entities/market-order.entity';
import { MarketOrderStatus } from '../orders/enums/market-order-status.enum';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { SellerOrderItem } from '../seller-orders/entities/seller-order-item.entity';
import { SellerOrderStatus } from '../seller-orders/enums/seller-order-status.enum';

function isNullOperator(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: string }).type === 'isNull'
  );
}

/** Simple where-matcher supporting plain equality and TypeORM's IsNull(). */
function matches<T extends Record<string, unknown>>(
  row: T,
  where: Record<string, unknown>,
): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;
    if (isNullOperator(value)) return row[key] === null;
    return row[key] === value;
  });
}

/**
 * Full in-memory fake for every entity CheckoutService/CartService/
 * InventoryService touch, so tests exercise real business logic (revalidation,
 * multi-vendor splitting, reservation, compensation) rather than a brittle
 * mock of TypeORM. Same approach as payment-api/refund.service.spec.ts and
 * marketplace-api/inventory.service.spec.ts.
 */
class FakeDb {
  products = new Map<string, Product>();
  variants = new Map<string, ProductVariant>();
  sellers = new Map<string, Seller>();
  inventoryItems = new Map<string, InventoryItem>();
  reservations = new Map<string, StockReservation>();
  carts = new Map<string, Cart>();
  cartItems = new Map<string, CartItem>();
  orders = new Map<string, MarketOrder>();
  sellerOrders = new Map<string, SellerOrder>();
  sellerOrderItems = new Map<string, SellerOrderItem>();

  private seq = 0;
  private nextId(prefix: string): string {
    return `${prefix}-${++this.seq}`;
  }

  /**
   * A real DB transaction rolls back every write on error; this in-memory
   * fake has no such semantics by default (each `.save()`/query-builder
   * `.execute()` mutates the Map immediately). Snapshot/restore around the
   * single `dataSource.transaction()` call in tests simulates rollback, so
   * "nothing committed on mid-transaction failure" tests are meaningful.
   */
  snapshot(): Record<string, Map<string, unknown>> {
    return {
      products: new Map(this.products),
      variants: new Map(this.variants),
      sellers: new Map(this.sellers),
      inventoryItems: new Map(this.inventoryItems),
      reservations: new Map(this.reservations),
      carts: new Map(this.carts),
      cartItems: new Map(this.cartItems),
      orders: new Map(this.orders),
      sellerOrders: new Map(this.sellerOrders),
      sellerOrderItems: new Map(this.sellerOrderItems),
    };
  }

  /**
   * Mutates each Map in place (clear + refill) rather than reassigning the
   * property, so every closure created via `table(this.x, ...)` — whether
   * captured before or after this call — keeps operating on the same
   * object and observes the restored contents.
   */
  restore(snapshot: Record<string, Map<string, unknown>>): void {
    const targets: Record<string, Map<string, unknown>> = {
      products: this.products,
      variants: this.variants,
      sellers: this.sellers,
      inventoryItems: this.inventoryItems,
      reservations: this.reservations,
      carts: this.carts,
      cartItems: this.cartItems,
      orders: this.orders,
      sellerOrders: this.sellerOrders,
      sellerOrderItems: this.sellerOrderItems,
    };
    for (const [key, target] of Object.entries(targets)) {
      target.clear();
      for (const [id, row] of snapshot[key]) target.set(id, row);
    }
  }

  private table<T extends { id?: string }>(
    map: Map<string, T>,
    prefix: string,
  ) {
    return {
      create: (data: Partial<T>) => ({ ...data }) as T,
      save: (entity: T | T[]) => {
        const list = Array.isArray(entity) ? entity : [entity];
        for (const e of list) {
          if (!e.id) e.id = this.nextId(prefix);
          map.set(e.id, { ...e });
        }
        return Promise.resolve(entity);
      },
      findOne: ({ where }: { where: Record<string, unknown> }) => {
        for (const row of map.values()) {
          if (matches(row as Record<string, unknown>, where)) {
            return Promise.resolve({ ...row });
          }
        }
        return Promise.resolve(null);
      },
      find: ({ where }: { where?: Record<string, unknown> } = {}) => {
        const rows = [...map.values()].filter((row) =>
          where ? matches(row as Record<string, unknown>, where) : true,
        );
        return Promise.resolve(rows.map((r) => ({ ...r })));
      },
      update: (id: string, patch: Partial<T>) => {
        const row = map.get(id);
        if (row) map.set(id, { ...row, ...patch });
        return Promise.resolve({ affected: row ? 1 : 0 });
      },
      delete: (where: { id?: string; cartId?: string }) => {
        if (where.id) map.delete(where.id);
        else if (where.cartId) {
          for (const [id, row] of map.entries()) {
            if (
              (row as unknown as { cartId?: string }).cartId === where.cartId
            ) {
              map.delete(id);
            }
          }
        }
        return Promise.resolve({ affected: 1 });
      },
      count: ({ where }: { where?: Record<string, unknown> } = {}) => {
        const rows = [...map.values()].filter((row) =>
          where ? matches(row as Record<string, unknown>, where) : true,
        );
        return Promise.resolve(rows.length);
      },
    };
  }

  private inventoryQueryBuilder() {
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
          const item = this.inventoryItems.get(whereParams.id as string);
          if (!item) return Promise.resolve({ affected: 0 });
          if (
            whereText.includes('available >= :qty') &&
            item.available < (whereParams.qty as number)
          ) {
            return Promise.resolve({ affected: 0 });
          }
          const updated = { ...item } as unknown as Record<string, unknown>;
          const qty = whereParams.qty as number;
          for (const [key, fn] of Object.entries(setValues)) {
            const expr = (fn as () => string)();
            const current = updated[key] as number;
            updated[key] = expr.includes('- :qty')
              ? current - qty
              : current + qty;
          }
          this.inventoryItems.set(item.id, updated as unknown as InventoryItem);
          return Promise.resolve({ affected: 1 });
        }
        if (targetEntity === StockReservation) {
          const reservation = this.reservations.get(whereParams.id as string);
          if (!reservation) return Promise.resolve({ affected: 0 });
          if (
            whereText.includes('status = :expected') &&
            reservation.status !== whereParams.expected
          ) {
            return Promise.resolve({ affected: 0 });
          }
          this.reservations.set(reservation.id, {
            ...reservation,
            ...setValues,
          });
          return Promise.resolve({ affected: 1 });
        }
        throw new Error('Unexpected entity in fake query builder');
      },
    };
    return qb;
  }

  manager(): EntityManager {
    const getRepository = (Entity: unknown) => {
      if (Entity === MarketOrder) return this.table(this.orders, 'order');
      if (Entity === SellerOrder)
        return this.table(this.sellerOrders, 'seller-order');
      if (Entity === SellerOrderItem)
        return this.table(this.sellerOrderItems, 'seller-order-item');
      if (Entity === Seller) return this.table(this.sellers, 'seller');
      if (Entity === StockReservation)
        return this.table(this.reservations, 'reservation');
      throw new Error('Unexpected entity in fake manager.getRepository');
    };
    return {
      getRepository,
      createQueryBuilder: () => this.inventoryQueryBuilder(),
    } as unknown as EntityManager;
  }

  repos() {
    return {
      cartRepository: this.table(this.carts, 'cart'),
      cartItemRepository: this.table(this.cartItems, 'cart-item'),
      productRepository: this.table(this.products, 'product'),
      variantRepository: this.table(this.variants, 'variant'),
      sellerRepository: this.table(this.sellers, 'seller'),
      inventoryRepository: this.table(this.inventoryItems, 'inventory'),
      reservationRepository: this.table(this.reservations, 'reservation'),
      orderRepository: this.table(this.orders, 'order'),
      sellerOrderRepository: this.table(this.sellerOrders, 'seller-order'),
      sellerOrderItemRepository: this.table(
        this.sellerOrderItems,
        'seller-order-item',
      ),
    };
  }
}

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    sellerId: 'seller-1',
    name: 'Maillot domicile',
    slug: 'maillot-domicile',
    description: null,
    shortDescription: null,
    categoryId: null,
    brand: null,
    sku: 'SKU-1',
    price: '50.000',
    compareAtPrice: null,
    taxRate: '0',
    weightKg: null,
    dimensions: null,
    status: ProductStatus.PUBLISHED,
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [],
    ...overrides,
  } as Product;
}

function buildSeller(overrides: Partial<Seller> = {}): Seller {
  return {
    id: 'seller-1',
    clubId: 'club-1',
    businessName: 'Boutique du club',
    ownerName: 'Owner',
    email: 'seller@example.com',
    phone: null,
    address: null,
    city: null,
    country: null,
    description: null,
    activityCategory: null,
    taxId: null,
    tradeRegister: null,
    logoUrl: null,
    status: SellerStatus.ACTIVE,
    statusReason: null,
    commissionRate: '10.00',
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
    ...overrides,
  };
}

function buildInventoryItem(
  overrides: Partial<InventoryItem> = {},
): InventoryItem {
  return {
    id: 'inv-1',
    sellerId: 'seller-1',
    productId: 'product-1',
    product: undefined as unknown as Product,
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

describe('CheckoutService', () => {
  let db: FakeDb;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let paymentApiClient: jest.Mocked<
    Pick<
      PaymentApiClientService,
      'initPayment' | 'getPaymentStatus' | 'getProvider'
    >
  >;
  let notificationApiClient: jest.Mocked<
    Pick<NotificationApiClientService, 'notify'>
  >;
  let notificationsService: jest.Mocked<Pick<NotificationsService, 'notify'>>;
  let cartService: CartService;
  let inventoryService: InventoryService;
  let checkoutService: CheckoutService;

  beforeEach(() => {
    db = new FakeDb();
    const repos = db.repos();

    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(
          async (cb: (manager: EntityManager) => Promise<unknown>) => {
            const snapshot = db.snapshot();
            try {
              return await cb(db.manager());
            } catch (error) {
              db.restore(snapshot);
              throw error;
            }
          },
        ),
    };

    notificationsService = { notify: jest.fn() };
    inventoryService = new InventoryService(
      repos.inventoryRepository as unknown as Repository<InventoryItem>,
      repos.reservationRepository as unknown as Repository<StockReservation>,
      dataSource as unknown as DataSource,
      notificationsService as unknown as NotificationsService,
    );

    cartService = new CartService(
      repos.cartRepository as unknown as Repository<Cart>,
      repos.cartItemRepository as unknown as Repository<CartItem>,
      repos.productRepository as unknown as Repository<Product>,
      repos.variantRepository as unknown as Repository<ProductVariant>,
    );

    paymentApiClient = {
      initPayment: jest.fn(),
      getPaymentStatus: jest.fn(),
      getProvider: jest.fn().mockReturnValue('konnect'),
    };
    notificationApiClient = { notify: jest.fn() };

    checkoutService = new CheckoutService(
      dataSource as unknown as DataSource,
      repos.orderRepository as unknown as Repository<MarketOrder>,
      repos.sellerOrderRepository as unknown as Repository<SellerOrder>,
      repos.sellerOrderItemRepository as unknown as Repository<SellerOrderItem>,
      repos.productRepository as unknown as Repository<Product>,
      repos.variantRepository as unknown as Repository<ProductVariant>,
      repos.inventoryRepository as unknown as Repository<InventoryItem>,
      cartService,
      inventoryService,
      paymentApiClient as unknown as PaymentApiClientService,
      notificationApiClient as unknown as NotificationApiClientService,
      notificationsService as unknown as NotificationsService,
    );
  });

  async function seedCartItem(
    memberId: string,
    product: Product,
    quantity: number,
    inventoryOverrides: Partial<InventoryItem> = {},
  ) {
    db.products.set(product.id, product);
    db.inventoryItems.set(
      `inv-${product.id}`,
      buildInventoryItem({
        id: `inv-${product.id}`,
        productId: product.id,
        sellerId: product.sellerId,
        ...inventoryOverrides,
      }),
    );
    await cartService.addItem(memberId, product.id, undefined, quantity);
  }

  describe('checkout', () => {
    it('creates a MarketOrder + one SellerOrder per vendor with immutable snapshots, and reserves stock', async () => {
      db.sellers.set(
        'seller-1',
        buildSeller({ id: 'seller-1', commissionRate: '10.00' }),
      );
      db.sellers.set(
        'seller-2',
        buildSeller({
          id: 'seller-2',
          businessName: 'Autre boutique',
          commissionRate: '20.00',
        }),
      );
      await seedCartItem(
        'member-1',
        buildProduct({
          id: 'product-1',
          sellerId: 'seller-1',
          price: '50.000',
        }),
        2,
      );
      await seedCartItem(
        'member-1',
        buildProduct({
          id: 'product-2',
          sellerId: 'seller-2',
          name: 'Écharpe',
          sku: 'SKU-2',
          price: '20.000',
        }),
        1,
      );

      paymentApiClient.initPayment.mockResolvedValue({
        paymentId: 'pay-1',
        payUrl: 'https://pay.example.com/pay-1',
      });

      const result = await checkoutService.checkout('member-1', {
        customerName: 'Ali Ben Salah',
        customerEmail: 'ali@example.com',
        shippingAddress: '1 rue du Stade, Tunis',
      });

      expect(result.payUrl).toBe('https://pay.example.com/pay-1');
      expect(result.order.paymentId).toBe('pay-1');
      // 2*50 + 1*20 = 120
      expect(db.orders.get(result.order.id)?.totalAmount).toBe('120.000');

      const sellerOrders = [...db.sellerOrders.values()];
      expect(sellerOrders).toHaveLength(2);
      const bySeller = Object.fromEntries(
        sellerOrders.map((o) => [o.sellerId, o]),
      );
      expect(bySeller['seller-1'].subtotal).toBe('100.000');
      expect(bySeller['seller-1'].commissionAmount).toBe('10.000');
      expect(bySeller['seller-1'].netAmount).toBe('90.000');
      expect(bySeller['seller-2'].subtotal).toBe('20.000');
      expect(bySeller['seller-2'].commissionAmount).toBe('4.000');

      const items = [...db.sellerOrderItems.values()];
      expect(items).toHaveLength(2);
      const item1 = items.find((i) => i.productId === 'product-1')!;
      expect(item1.productName).toBe('Maillot domicile');
      expect(item1.unitPrice).toBe('50.000');
      expect(item1.totalPrice).toBe('100.000');
      expect(item1.reservationId).toBeTruthy();

      // Stock reserved.
      expect(db.inventoryItems.get('inv-product-1')?.available).toBe(8);
      expect(db.inventoryItems.get('inv-product-1')?.reserved).toBe(2);

      // Cart cleared.
      expect(await cartService.viewCart('member-1')).toHaveLength(0);
    });

    it('rejects checkout with an empty cart', async () => {
      await expect(
        checkoutService.checkout('member-1', {
          customerName: 'Ali',
          customerEmail: 'ali@example.com',
          shippingAddress: 'addr',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('revalidates price/status server-side: rejects a product no longer PUBLISHED even if it was in the cart', async () => {
      db.sellers.set('seller-1', buildSeller());
      await seedCartItem(
        'member-1',
        buildProduct({ status: ProductStatus.PUBLISHED }),
        1,
      );
      // Le produit est retiré de la vente après l'ajout au panier.
      db.products.set('product-1', {
        ...db.products.get('product-1')!,
        status: ProductStatus.DRAFT,
      });

      await expect(
        checkoutService.checkout('member-1', {
          customerName: 'Ali',
          customerEmail: 'ali@example.com',
          shippingAddress: 'addr',
        }),
      ).rejects.toThrow(ConflictException);

      expect(paymentApiClient.initPayment).not.toHaveBeenCalled();
      expect(db.orders.size).toBe(0);
    });

    it('rejects checkout when stock is insufficient (revalidated at checkout time, not cart time)', async () => {
      db.sellers.set('seller-1', buildSeller());
      await seedCartItem('member-1', buildProduct(), 5, { available: 2 });

      await expect(
        checkoutService.checkout('member-1', {
          customerName: 'Ali',
          customerEmail: 'ali@example.com',
          shippingAddress: 'addr',
        }),
      ).rejects.toThrow(ConflictException);

      expect(db.orders.size).toBe(0);
      expect(db.inventoryItems.get('inv-product-1')?.available).toBe(2); // inchangé
    });

    it('rolls back the whole multi-vendor order (including seller-1 reservation) when seller-2 runs out of stock', async () => {
      db.sellers.set('seller-1', buildSeller({ id: 'seller-1' }));
      db.sellers.set('seller-2', buildSeller({ id: 'seller-2' }));
      await seedCartItem(
        'member-1',
        buildProduct({ id: 'product-1', sellerId: 'seller-1' }),
        2,
        { available: 10 },
      );
      await seedCartItem(
        'member-1',
        buildProduct({ id: 'product-2', sellerId: 'seller-2', sku: 'SKU-2' }),
        5,
        { available: 1 },
      );

      await expect(
        checkoutService.checkout('member-1', {
          customerName: 'Ali',
          customerEmail: 'ali@example.com',
          shippingAddress: 'addr',
        }),
      ).rejects.toThrow(ConflictException);

      // Rien ne doit avoir été committé : ni la commande, ni la réservation
      // du produit du premier vendeur (traité avant celui qui échoue).
      expect(db.orders.size).toBe(0);
      expect(db.sellerOrders.size).toBe(0);
      expect(db.inventoryItems.get('inv-product-1')?.available).toBe(10);
    });

    it('cancels the order and releases reserved stock when payment initiation fails', async () => {
      db.sellers.set('seller-1', buildSeller());
      await seedCartItem('member-1', buildProduct(), 3, { available: 10 });
      paymentApiClient.initPayment.mockRejectedValue(
        new Error('payment-api unreachable'),
      );

      await expect(
        checkoutService.checkout('member-1', {
          customerName: 'Ali',
          customerEmail: 'ali@example.com',
          shippingAddress: 'addr',
        }),
      ).rejects.toThrow('payment-api unreachable');

      const order = [...db.orders.values()][0];
      expect(order.status).toBe(MarketOrderStatus.CANCELLED);
      const sellerOrder = [...db.sellerOrders.values()][0];
      expect(sellerOrder.status).toBe(SellerOrderStatus.CANCELLED);
      expect(db.inventoryItems.get('inv-product-1')?.available).toBe(10);
      expect(db.inventoryItems.get('inv-product-1')?.reserved).toBe(0);
    });

    it('is idempotent: replaying the same idempotency key does not create a second order', async () => {
      db.sellers.set('seller-1', buildSeller());
      await seedCartItem('member-1', buildProduct(), 1, { available: 10 });
      paymentApiClient.initPayment.mockResolvedValue({
        paymentId: 'pay-1',
        payUrl: 'https://pay.example.com/pay-1',
      });

      const first = await checkoutService.checkout(
        'member-1',
        {
          customerName: 'Ali',
          customerEmail: 'ali@example.com',
          shippingAddress: 'addr',
        },
        'idem-key-1',
      );

      const second = await checkoutService.checkout(
        'member-1',
        {
          customerName: 'Ali',
          customerEmail: 'ali@example.com',
          shippingAddress: 'addr',
        },
        'idem-key-1',
      );

      expect(second.order.id).toBe(first.order.id);
      expect(db.orders.size).toBe(1);
      // initPayment rappelé (payment-api est lui-même idempotent par la
      // même clé) mais aucune seconde réservation/commande créée ici.
      expect(paymentApiClient.initPayment).toHaveBeenCalledTimes(2);
      expect(db.inventoryItems.get('inv-product-1')?.reserved).toBe(1);
    });

    it('requires firstName/lastName/phone for the paymee provider before reserving anything', async () => {
      paymentApiClient.getProvider.mockReturnValue('paymee');
      db.sellers.set('seller-1', buildSeller());
      await seedCartItem('member-1', buildProduct(), 1, { available: 10 });

      await expect(
        checkoutService.checkout('member-1', {
          customerName: 'Ali',
          customerEmail: 'ali@example.com',
          shippingAddress: 'addr',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(db.orders.size).toBe(0);
      expect(db.inventoryItems.get('inv-product-1')?.reserved).toBe(0);
    });
  });

  describe('confirmOrder', () => {
    it('confirms sub-orders and converts reservations to sold only after payment is confirmed, and notifies seller + member', async () => {
      db.sellers.set('seller-1', buildSeller());
      await seedCartItem('member-1', buildProduct(), 2, { available: 10 });
      paymentApiClient.initPayment.mockResolvedValue({
        paymentId: 'pay-1',
        payUrl: 'https://pay.example.com/pay-1',
      });

      const { order } = await checkoutService.checkout('member-1', {
        customerName: 'Ali',
        customerEmail: 'ali@example.com',
        shippingAddress: 'addr',
      });

      // Pas encore confirmée : le stock reste "reserved", pas "sold".
      expect(db.inventoryItems.get('inv-product-1')?.sold).toBe(0);

      await checkoutService.confirmOrder(order.id);

      expect(db.orders.get(order.id)?.status).toBe(MarketOrderStatus.PAID);
      const sellerOrder = [...db.sellerOrders.values()][0];
      expect(sellerOrder.status).toBe(SellerOrderStatus.CONFIRMED);
      expect(db.inventoryItems.get('inv-product-1')?.reserved).toBe(0);
      expect(db.inventoryItems.get('inv-product-1')?.sold).toBe(2);
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'seller-1',
        NotificationType.NEW_ORDER,
        expect.any(String),
        expect.any(String),
      );
      expect(notificationApiClient.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MARKET_ORDER_CONFIRMED',
          userId: 'member-1',
        }),
      );
    });

    it('is idempotent: confirming an already-PAID order twice does not double-notify', async () => {
      db.sellers.set('seller-1', buildSeller());
      await seedCartItem('member-1', buildProduct(), 1, { available: 10 });
      paymentApiClient.initPayment.mockResolvedValue({
        paymentId: 'pay-1',
        payUrl: 'https://pay.example.com/pay-1',
      });
      const { order } = await checkoutService.checkout('member-1', {
        customerName: 'Ali',
        customerEmail: 'ali@example.com',
        shippingAddress: 'addr',
      });

      await checkoutService.confirmOrder(order.id);
      notificationsService.notify.mockClear();
      notificationApiClient.notify.mockClear();

      await checkoutService.confirmOrder(order.id);

      expect(notificationsService.notify).not.toHaveBeenCalled();
      expect(notificationApiClient.notify).not.toHaveBeenCalled();
      expect(db.inventoryItems.get('inv-product-1')?.sold).toBe(1);
    });
  });

  describe('reconcilePaymentStatus', () => {
    it('confirms the order when payment-api reports PAID (webhook / late poll)', async () => {
      db.sellers.set('seller-1', buildSeller());
      await seedCartItem('member-1', buildProduct(), 1, { available: 10 });
      paymentApiClient.initPayment.mockResolvedValue({
        paymentId: 'pay-1',
        payUrl: 'https://pay.example.com/pay-1',
      });
      const { order } = await checkoutService.checkout('member-1', {
        customerName: 'Ali',
        customerEmail: 'ali@example.com',
        shippingAddress: 'addr',
      });

      paymentApiClient.getPaymentStatus.mockResolvedValue('PAID');
      await checkoutService.reconcilePaymentStatus('pay-1');

      expect(db.orders.get(order.id)?.status).toBe(MarketOrderStatus.PAID);
    });

    it('cancels and releases stock when payment-api reports FAILED (late webhook after a lost delivery)', async () => {
      db.sellers.set('seller-1', buildSeller());
      await seedCartItem('member-1', buildProduct(), 1, { available: 10 });
      paymentApiClient.initPayment.mockResolvedValue({
        paymentId: 'pay-1',
        payUrl: 'https://pay.example.com/pay-1',
      });
      const { order } = await checkoutService.checkout('member-1', {
        customerName: 'Ali',
        customerEmail: 'ali@example.com',
        shippingAddress: 'addr',
      });

      paymentApiClient.getPaymentStatus.mockResolvedValue('FAILED');
      await checkoutService.reconcilePaymentStatus('pay-1');

      expect(db.orders.get(order.id)?.status).toBe(MarketOrderStatus.CANCELLED);
      expect(db.inventoryItems.get('inv-product-1')?.available).toBe(10);
    });

    it('does nothing for a paymentId that does not belong to a marketplace order', async () => {
      await expect(
        checkoutService.reconcilePaymentStatus('unrelated-payment'),
      ).resolves.toBeUndefined();
      expect(paymentApiClient.getPaymentStatus).not.toHaveBeenCalled();
    });
  });
});
