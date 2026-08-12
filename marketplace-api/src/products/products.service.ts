import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      status: ProductStatus.DRAFT,
    });
    return this.repository.save(product);
  }

  async findAllBySeller(sellerId: string): Promise<Product[]> {
    return this.repository.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForSeller(id: string, sellerId: string): Promise<Product> {
    const product = await this.repository.findOne({ where: { id, sellerId } });
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

    Object.assign(product, {
      ...dto,
      price: dto.price !== undefined ? String(dto.price) : product.price,
      compareAtPrice:
        dto.compareAtPrice !== undefined
          ? String(dto.compareAtPrice)
          : product.compareAtPrice,
      taxRate:
        dto.taxRate !== undefined ? String(dto.taxRate) : product.taxRate,
    });
    return this.repository.save(product);
  }

  async remove(id: string, sellerId: string): Promise<void> {
    const product = await this.findOneForSeller(id, sellerId);
    if (product.status !== ProductStatus.DRAFT) {
      throw new ConflictException('Seul un produit DRAFT peut être supprimé');
    }
    await this.repository.remove(product);
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
    product.status = nextStatus;
    if (nextStatus === ProductStatus.DRAFT) {
      product.rejectionReason = null;
    }
    return this.repository.save(product);
  }
}
