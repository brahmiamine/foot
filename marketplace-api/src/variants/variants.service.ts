import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { UpsertVariantDto } from './dto/upsert-variant.dto';

@Injectable()
export class VariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly repository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /** Vérifie que `productId` appartient bien au vendeur avant toute lecture/écriture de ses variantes. */
  private async assertOwnership(
    productId: string,
    sellerId: string,
  ): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id: productId, sellerId },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
  }

  async findAllForProduct(
    productId: string,
    sellerId: string,
  ): Promise<ProductVariant[]> {
    await this.assertOwnership(productId, sellerId);
    return this.repository.find({ where: { productId } });
  }

  async create(
    productId: string,
    sellerId: string,
    dto: UpsertVariantDto,
  ): Promise<ProductVariant> {
    await this.assertOwnership(productId, sellerId);
    const variant = this.repository.create({
      productId,
      sku: dto.sku,
      attributes: dto.attributes,
      price: dto.price !== undefined ? String(dto.price) : null,
    });
    return this.repository.save(variant);
  }

  async update(
    id: string,
    productId: string,
    sellerId: string,
    dto: UpsertVariantDto,
  ): Promise<ProductVariant> {
    await this.assertOwnership(productId, sellerId);
    const variant = await this.repository.findOne({ where: { id, productId } });
    if (!variant) throw new NotFoundException('Variante introuvable');

    variant.sku = dto.sku;
    variant.attributes = dto.attributes;
    variant.price = dto.price !== undefined ? String(dto.price) : null;
    return this.repository.save(variant);
  }

  async remove(id: string, productId: string, sellerId: string): Promise<void> {
    await this.assertOwnership(productId, sellerId);
    const result = await this.repository.delete({ id, productId });
    if (!result.affected) throw new NotFoundException('Variante introuvable');
  }
}
