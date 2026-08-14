import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../variants/entities/product-variant.entity';

/**
 * TASK-P0-004 (todo.md). Panier serveur — le prix/la disponibilité affichés
 * ici sont informatifs seulement, jamais figés : seul
 * CheckoutService.checkout revalide tout au moment décisif. addItem ne
 * vérifie que l'existence du produit/de la variante (pas son statut publié
 * ni son stock), pour ne pas empêcher un membre de garder un produit en
 * panier pendant qu'il redevient temporairement indisponible.
 */
@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly itemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async getOrCreateCart(memberId: string): Promise<Cart> {
    const existing = await this.cartRepository.findOne({ where: { memberId } });
    if (existing) return existing;

    const cart = this.cartRepository.create({ memberId });
    try {
      return await this.cartRepository.save(cart);
    } catch (error) {
      // Course entre deux créations concurrentes du même panier (contrainte
      // unique sur memberId) : celle qui perd relit celle qui a gagné.
      const raced = await this.cartRepository.findOne({ where: { memberId } });
      if (raced) return raced;
      throw error;
    }
  }

  async viewCart(memberId: string): Promise<CartItem[]> {
    const cart = await this.cartRepository.findOne({ where: { memberId } });
    if (!cart) return [];
    return this.itemRepository.find({
      where: { cartId: cart.id },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Ajoute `quantity` unités ; si la ligne (productId, variantId) existe
   * déjà, incrémente au lieu de dupliquer — vérifié par relecture explicite
   * plutôt que par la seule contrainte unique en base, qui ne détecte pas
   * les doublons quand `variantId` est NULL (NULL n'est jamais égal à
   * NULL dans un index unique MySQL — un produit sans variante pourrait
   * sinon obtenir deux lignes distinctes).
   */
  async addItem(
    memberId: string,
    productId: string,
    variantId: string | undefined,
    quantity: number,
  ): Promise<CartItem> {
    const product = await this.productRepository.findOne({
      where: { id: productId, deletedAt: IsNull() },
    });
    if (!product) throw new NotFoundException('Produit introuvable.');

    if (variantId) {
      const variant = await this.variantRepository.findOne({
        where: { id: variantId, productId },
      });
      if (!variant) throw new NotFoundException('Variante introuvable.');
    }

    const cart = await this.getOrCreateCart(memberId);
    const existing = await this.itemRepository.findOne({
      where: { cartId: cart.id, productId, variantId: variantId ?? IsNull() },
    });

    if (existing) {
      existing.quantity += quantity;
      return this.itemRepository.save(existing);
    }

    const item = this.itemRepository.create({
      cartId: cart.id,
      productId,
      variantId: variantId ?? null,
      quantity,
    });
    return this.itemRepository.save(item);
  }

  /** `quantity: 0` retire la ligne. */
  async updateItemQuantity(
    memberId: string,
    itemId: string,
    quantity: number,
  ): Promise<CartItem | null> {
    const item = await this.findOwnedItem(memberId, itemId);

    if (quantity === 0) {
      await this.itemRepository.delete({ id: item.id });
      return null;
    }

    item.quantity = quantity;
    return this.itemRepository.save(item);
  }

  async removeItem(memberId: string, itemId: string): Promise<void> {
    const item = await this.findOwnedItem(memberId, itemId);
    await this.itemRepository.delete({ id: item.id });
  }

  async clearCart(memberId: string): Promise<void> {
    const cart = await this.cartRepository.findOne({ where: { memberId } });
    if (!cart) return;
    await this.itemRepository.delete({ cartId: cart.id });
  }

  private async findOwnedItem(
    memberId: string,
    itemId: string,
  ): Promise<CartItem> {
    const cart = await this.cartRepository.findOne({ where: { memberId } });
    if (!cart) throw new NotFoundException('Panier introuvable.');
    const item = await this.itemRepository.findOne({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Ligne de panier introuvable.');
    return item;
  }
}
