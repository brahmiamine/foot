import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CartService } from './cart.service';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../variants/entities/product-variant.entity';

function isNullOperator(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: string }).type === 'isNull'
  );
}

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

class FakeTable<T extends { id?: string }> {
  rows = new Map<string, T>();
  private seq = 0;
  constructor(private prefix: string) {}

  create(data: Partial<T>): T {
    return { ...data } as T;
  }
  save(entity: T): Promise<T> {
    if (!entity.id) entity.id = `${this.prefix}-${++this.seq}`;
    this.rows.set(entity.id, { ...entity });
    return Promise.resolve(entity);
  }
  findOne({ where }: { where: Record<string, unknown> }): Promise<T | null> {
    for (const row of this.rows.values()) {
      if (matches(row as Record<string, unknown>, where)) {
        return Promise.resolve({ ...row });
      }
    }
    return Promise.resolve(null);
  }
  find({ where }: { where?: Record<string, unknown> } = {}): Promise<T[]> {
    const rows = [...this.rows.values()].filter((r) =>
      where ? matches(r as Record<string, unknown>, where) : true,
    );
    return Promise.resolve(rows.map((r) => ({ ...r })));
  }
  delete(where: {
    id?: string;
    cartId?: string;
  }): Promise<{ affected: number }> {
    if (where.id) this.rows.delete(where.id);
    else if (where.cartId) {
      for (const [id, row] of this.rows.entries()) {
        if ((row as unknown as { cartId?: string }).cartId === where.cartId) {
          this.rows.delete(id);
        }
      }
    }
    return Promise.resolve({ affected: 1 });
  }
}

describe('CartService', () => {
  let carts: FakeTable<Cart>;
  let items: FakeTable<CartItem>;
  let products: FakeTable<Product>;
  let variants: FakeTable<ProductVariant>;
  let service: CartService;

  beforeEach(() => {
    carts = new FakeTable<Cart>('cart');
    items = new FakeTable<CartItem>('item');
    products = new FakeTable<Product>('product');
    variants = new FakeTable<ProductVariant>('variant');

    service = new CartService(
      carts as unknown as Repository<Cart>,
      items as unknown as Repository<CartItem>,
      products as unknown as Repository<Product>,
      variants as unknown as Repository<ProductVariant>,
    );

    products.rows.set('product-1', {
      id: 'product-1',
      deletedAt: null,
    } as Product);
  });

  it('creates the cart lazily and adds a first line', async () => {
    const item = await service.addItem('member-1', 'product-1', undefined, 2);
    expect(item.quantity).toBe(2);
    expect(await service.viewCart('member-1')).toHaveLength(1);
  });

  it('increments quantity instead of duplicating when the same product is added twice (no variant)', async () => {
    await service.addItem('member-1', 'product-1', undefined, 2);
    await service.addItem('member-1', 'product-1', undefined, 3);

    const cartItems = await service.viewCart('member-1');
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toBe(5);
  });

  it('throws for a product that does not exist', async () => {
    await expect(
      service.addItem('member-1', 'missing-product', undefined, 1),
    ).rejects.toThrow(NotFoundException);
  });

  it('removes the line when quantity is updated to 0', async () => {
    const item = await service.addItem('member-1', 'product-1', undefined, 2);
    const result = await service.updateItemQuantity('member-1', item.id, 0);

    expect(result).toBeNull();
    expect(await service.viewCart('member-1')).toHaveLength(0);
  });

  it('removeItem deletes a single line, leaving others untouched', async () => {
    const item1 = await service.addItem('member-1', 'product-1', undefined, 1);
    products.rows.set('product-2', {
      id: 'product-2',
      deletedAt: null,
    } as Product);
    await service.addItem('member-1', 'product-2', undefined, 1);

    await service.removeItem('member-1', item1.id);

    const remaining = await service.viewCart('member-1');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].productId).toBe('product-2');
  });

  it('clearCart empties the cart without deleting it', async () => {
    await service.addItem('member-1', 'product-1', undefined, 1);
    await service.clearCart('member-1');

    expect(await service.viewCart('member-1')).toHaveLength(0);
    // Le panier lui-même reste (idempotent : un futur ajout le retrouve).
    const item = await service.addItem('member-1', 'product-1', undefined, 1);
    expect(item.quantity).toBe(1);
  });

  it('scopes carts by member: two members never share a line', async () => {
    await service.addItem('member-1', 'product-1', undefined, 1);
    await service.addItem('member-2', 'product-1', undefined, 5);

    expect(await service.viewCart('member-1')).toHaveLength(1);
    expect((await service.viewCart('member-2'))[0].quantity).toBe(5);
  });
});
