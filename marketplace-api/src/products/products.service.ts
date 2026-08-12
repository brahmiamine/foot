import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import {
  ProductStatus,
  SELLER_ALLOWED_PRODUCT_TRANSITIONS,
} from './enums/product-status.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/** Statuts sur lesquels le vendeur peut encore modifier les champs du produit. */
const SELLER_EDITABLE_STATUSES = [ProductStatus.DRAFT, ProductStatus.REJECTED];

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {}

  async create(sellerId: string, dto: CreateProductDto): Promise<Product> {
    const product = this.repository.create({
      sellerId,
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      shortDescription: dto.shortDescription ?? null,
      categoryId: dto.categoryId ?? null,
      brand: dto.brand ?? null,
      sku: dto.sku,
      price: String(dto.price),
      compareAtPrice:
        dto.compareAtPrice !== undefined ? String(dto.compareAtPrice) : null,
      taxRate: dto.taxRate !== undefined ? String(dto.taxRate) : '0',
      weightKg: dto.weightKg !== undefined ? String(dto.weightKg) : null,
      dimensions: dto.dimensions ?? null,
      status: ProductStatus.DRAFT,
    });
    return this.repository.save(product);
  }

  async findAllBySeller(sellerId: string): Promise<Product[]> {
    return this.repository.find({
      where: { sellerId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForSeller(id: string, sellerId: string): Promise<Product> {
    const product = await this.repository.findOne({
      where: { id, sellerId, deletedAt: IsNull() },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  async update(
    id: string,
    sellerId: string,
    dto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOneForSeller(id, sellerId);
    if (!SELLER_EDITABLE_STATUSES.includes(product.status)) {
      throw new ConflictException(
        `Produit non modifiable dans le statut ${product.status}`,
      );
    }

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.slug !== undefined) product.slug = dto.slug;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.shortDescription !== undefined)
      product.shortDescription = dto.shortDescription;
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;
    if (dto.brand !== undefined) product.brand = dto.brand;
    if (dto.sku !== undefined) product.sku = dto.sku;
    if (dto.price !== undefined) product.price = String(dto.price);
    if (dto.compareAtPrice !== undefined) {
      product.compareAtPrice =
        dto.compareAtPrice === null ? null : String(dto.compareAtPrice);
    }
    if (dto.taxRate !== undefined) product.taxRate = String(dto.taxRate);
    if (dto.weightKg !== undefined) {
      product.weightKg = dto.weightKg === null ? null : String(dto.weightKg);
    }
    if (dto.dimensions !== undefined) product.dimensions = dto.dimensions;

    return this.repository.save(product);
  }

  /**
   * Active/désactive la visibilité d'un produit déjà publié — n'est pas une
   * modification de contenu, donc possible même hors des statuts éditables
   * (DRAFT/REJECTED), sans redéclencher une modération. Distinct de
   * `update()` à dessein (voir sellerPortal/src/app/api/products/[id]/
   * toggle-active/route.ts, comportement préservé par TS-04).
   */
  async toggleActive(id: string, sellerId: string): Promise<Product> {
    const product = await this.findOneForSeller(id, sellerId);
    product.isActive = !product.isActive;
    return this.repository.save(product);
  }

  /**
   * Suppression logique uniquement, quel que soit le statut — l'historique
   * (commandes passées référençant ce produit) doit rester intact, jamais
   * de suppression physique (même comportement que sellerPortal avant
   * migration, voir avancement.md TS-04).
   */
  async remove(id: string, sellerId: string): Promise<void> {
    const product = await this.findOneForSeller(id, sellerId);
    product.deletedAt = new Date();
    product.isActive = false;
    await this.repository.save(product);
  }

  /** Transition déclenchée par le vendeur (DRAFT->SUBMITTED, SUBMITTED->DRAFT, REJECTED->DRAFT). */
  async sellerTransition(
    id: string,
    sellerId: string,
    nextStatus: ProductStatus,
  ): Promise<Product> {
    const product = await this.findOneForSeller(id, sellerId);
    const allowed = SELLER_ALLOWED_PRODUCT_TRANSITIONS[product.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new ConflictException(
        `Transition ${product.status} → ${nextStatus} non autorisée`,
      );
    }

    if (
      nextStatus === ProductStatus.SUBMITTED &&
      (!product.price || Number(product.price) <= 0)
    ) {
      throw new ConflictException(
        'Le prix doit être renseigné avant soumission',
      );
    }

    product.status = nextStatus;
    if (nextStatus === ProductStatus.DRAFT) {
      product.rejectionReason = null;
    }
    return this.repository.save(product);
  }
}
