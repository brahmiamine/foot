import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class VariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly repository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

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
    dto: CreateVariantDto,
  ): Promise<ProductVariant> {
    await this.assertOwnership(productId, sellerId);
    return this.dataSource.transaction(async (manager) => {
      const variantRepository = manager.getRepository(ProductVariant);
      const variant = await variantRepository.save(
        variantRepository.create({
          productId,
          sku: dto.sku,
          attributes: dto.attributes,
          price: dto.price !== undefined ? String(dto.price) : null,
          imageUrl: dto.imageUrl ?? null,
        }),
      );
      const inventoryRepository = manager.getRepository(InventoryItem);
      await inventoryRepository.save(
        inventoryRepository.create({
          sellerId,
          productId,
          variantId: variant.id,
          available: dto.initialStock ?? 0,
          reserved: 0,
          sold: 0,
        }),
      );
      return variant;
    });
  }

  async update(
    id: string,
    productId: string,
    sellerId: string,
    dto: UpdateVariantDto,
  ): Promise<ProductVariant> {
    await this.assertOwnership(productId, sellerId);
    const variant = await this.repository.findOne({
      where: { id, productId },
    });
    if (!variant) throw new NotFoundException('Variante introuvable');
    if (dto.sku !== undefined) variant.sku = dto.sku;
    if (dto.attributes !== undefined) variant.attributes = dto.attributes;
    if (dto.price !== undefined) {
      variant.price = dto.price === null ? null : String(dto.price);
    }
    if (dto.imageUrl !== undefined) variant.imageUrl = dto.imageUrl;
    if (dto.isActive !== undefined) variant.isActive = dto.isActive;
    return this.repository.save(variant);
  }

  async updateById(
    id: string,
    sellerId: string,
    dto: UpdateVariantDto,
  ): Promise<ProductVariant> {
    const variant = await this.repository.findOne({ where: { id } });
    if (!variant) throw new NotFoundException('Variante introuvable');
    return this.update(id, variant.productId, sellerId, dto);
  }

  async toggleActive(
    id: string,
    productId: string,
    sellerId: string,
  ): Promise<ProductVariant> {
    await this.assertOwnership(productId, sellerId);
    const variant = await this.repository.findOne({
      where: { id, productId },
    });
    if (!variant) throw new NotFoundException('Variante introuvable');
    variant.isActive = !variant.isActive;
    return this.repository.save(variant);
  }

  async remove(id: string, productId: string, sellerId: string): Promise<void> {
    await this.assertOwnership(productId, sellerId);
    const result = await this.repository.delete({ id, productId });
    if (!result.affected) throw new NotFoundException('Variante introuvable');
  }

  async removeById(id: string, sellerId: string): Promise<void> {
    const variant = await this.repository.findOne({ where: { id } });
    if (!variant) throw new NotFoundException('Variante introuvable');
    await this.remove(id, variant.productId, sellerId);
  }
}
