import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { CentralNotificationsClient } from '../notifications/central-notifications.client';
import { MarketplaceClubSettings } from '../sellers/entities/marketplace-club-settings.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductImage } from './entities/product-image.entity';
import { Product } from './entities/product.entity';
import { ProductStatus, SELLER_ALLOWED_PRODUCT_TRANSITIONS } from './enums/product-status.enum';

const SELLER_EDITABLE_STATUSES = [ProductStatus.DRAFT, ProductStatus.REJECTED, ProductStatus.APPROVED, ProductStatus.PUBLISHED];
const SENSITIVE_FIELDS: Array<keyof UpdateProductDto> = ['name', 'description', 'shortDescription', 'categoryId', 'brand', 'price', 'compareAtPrice', 'images'];

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private readonly repository: Repository<Product>, @InjectDataSource() private readonly dataSource: DataSource, private readonly centralNotifications: CentralNotificationsClient) {}

  async create(sellerId: string, dto: CreateProductDto): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);
      const product = productRepository.create({ sellerId, name: dto.name, slug: dto.slug, description: dto.description ?? null, shortDescription: dto.shortDescription ?? null, categoryId: dto.categoryId ?? null, brand: dto.brand ?? null, sku: dto.sku, price: String(dto.price), compareAtPrice: dto.compareAtPrice !== undefined ? String(dto.compareAtPrice) : null, taxRate: dto.taxRate !== undefined ? String(dto.taxRate) : '0', weightKg: dto.weightKg !== undefined ? String(dto.weightKg) : null, dimensions: dto.dimensions ?? null, status: ProductStatus.DRAFT });
      const saved = await productRepository.save(product);
      if (dto.images?.length) { const imageRepository = manager.getRepository(ProductImage); await imageRepository.save(dto.images.map((url, position) => imageRepository.create({ productId: saved.id, url, position }))); }
      const inventoryRepository = manager.getRepository(InventoryItem);
      await inventoryRepository.save(inventoryRepository.create({ sellerId, productId: saved.id, variantId: null, available: 0, reserved: 0, sold: 0 }));
      return saved;
    });
  }

  findAllBySeller(sellerId: string): Promise<Product[]> { return this.repository.find({ where: { sellerId, deletedAt: IsNull() }, order: { createdAt: 'DESC' } }); }
  async findOneForSeller(id: string, sellerId: string): Promise<Product> { const product = await this.repository.findOne({ where: { id, sellerId, deletedAt: IsNull() } }); if (!product) throw new NotFoundException('Produit introuvable'); return product; }

  private applyUpdate(product: Product, dto: UpdateProductDto): void {
    if (dto.name !== undefined) product.name = dto.name; if (dto.slug !== undefined) product.slug = dto.slug; if (dto.description !== undefined) product.description = dto.description;
    if (dto.shortDescription !== undefined) product.shortDescription = dto.shortDescription; if (dto.categoryId !== undefined) product.categoryId = dto.categoryId; if (dto.brand !== undefined) product.brand = dto.brand;
    if (dto.sku !== undefined) product.sku = dto.sku; if (dto.price !== undefined) product.price = String(dto.price); if (dto.compareAtPrice !== undefined) product.compareAtPrice = dto.compareAtPrice === null ? null : String(dto.compareAtPrice);
    if (dto.taxRate !== undefined) product.taxRate = String(dto.taxRate); if (dto.weightKg !== undefined) product.weightKg = dto.weightKg === null ? null : String(dto.weightKg); if (dto.dimensions !== undefined) product.dimensions = dto.dimensions;
  }

  private async policyForSeller(sellerId: string): Promise<{ clubId: string; settings: MarketplaceClubSettings }> {
    const seller = await this.dataSource.getRepository(Seller).findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    const repo = this.dataSource.getRepository(MarketplaceClubSettings);
    const settings = await repo.findOne({ where: { clubId: seller.clubId } }) ?? repo.create({ clubId: seller.clubId, sellerApplicationsEnabled: true, sellerApprovalRequired: true, productApprovalRequired: true, productReapprovalOnSensitiveChange: true, updatedBy: null });
    return { clubId: seller.clubId, settings };
  }

  private hasSensitiveChange(dto: UpdateProductDto): boolean { return SENSITIVE_FIELDS.some((field) => dto[field] !== undefined); }
  private notifyReview(clubId: string, product: Product, reason: string): Promise<void> { return this.centralNotifications.notifyClubAdmins(clubId, 'PRODUCT_SUBMITTED', 'Produit à approuver', `${product.name} nécessite une validation du club (${reason}).`, { productId: product.id, sellerId: product.sellerId }, `product:${product.id}:${product.updatedAt?.getTime?.() ?? Date.now()}:submitted`); }

  async update(id: string, sellerId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOneForSeller(id, sellerId);
    if (!SELLER_EDITABLE_STATUSES.includes(product.status)) throw new ConflictException(`Produit non modifiable dans le statut ${product.status}`);
    let notifyClubId: string | null = null;
    if ([ProductStatus.APPROVED, ProductStatus.PUBLISHED].includes(product.status)) {
      const { clubId, settings } = await this.policyForSeller(sellerId);
      if (settings.productApprovalRequired && settings.productReapprovalOnSensitiveChange && this.hasSensitiveChange(dto)) {
        product.status = ProductStatus.SUBMITTED; product.reviewedBy = null; product.reviewedAt = null; product.rejectionReason = null; notifyClubId = clubId;
      } else if (!settings.productApprovalRequired && product.status === ProductStatus.APPROVED) product.status = ProductStatus.PUBLISHED;
    }
    this.applyUpdate(product, dto);
    let saved: Product;
    if (dto.images === undefined) saved = await this.repository.save(product);
    else saved = await this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product); const persisted = await productRepository.save(product); const imageRepository = manager.getRepository(ProductImage); await imageRepository.delete({ productId: id });
      if (dto.images?.length) await imageRepository.save(dto.images.map((url, position) => imageRepository.create({ productId: id, url, position })));
      return persisted;
    });
    if (notifyClubId) await this.notifyReview(notifyClubId, saved, 'modification sensible');
    return saved;
  }

  async toggleActive(id: string, sellerId: string): Promise<Product> { const product = await this.findOneForSeller(id, sellerId); product.isActive = !product.isActive; return this.repository.save(product); }
  async remove(id: string, sellerId: string): Promise<void> { const product = await this.findOneForSeller(id, sellerId); product.deletedAt = new Date(); product.isActive = false; await this.repository.save(product); }

  async sellerTransition(id: string, sellerId: string, nextStatus: ProductStatus): Promise<Product> {
    const product = await this.findOneForSeller(id, sellerId);
    const allowed = SELLER_ALLOWED_PRODUCT_TRANSITIONS[product.status] ?? [];
    if (!allowed.includes(nextStatus)) throw new ConflictException(`Transition ${product.status} → ${nextStatus} non autorisée`);
    if (nextStatus === ProductStatus.SUBMITTED && (!product.price || Number(product.price) <= 0)) throw new ConflictException('Le prix doit être renseigné avant soumission');
    if (nextStatus === ProductStatus.SUBMITTED) {
      const { clubId, settings } = await this.policyForSeller(sellerId);
      product.status = settings.productApprovalRequired ? ProductStatus.SUBMITTED : ProductStatus.PUBLISHED;
      product.rejectionReason = null; product.reviewedBy = null; product.reviewedAt = null;
      const saved = await this.repository.save(product);
      if (settings.productApprovalRequired) await this.notifyReview(clubId, saved, 'nouvelle soumission');
      return saved;
    }
    product.status = nextStatus;
    if (nextStatus === ProductStatus.DRAFT) product.rejectionReason = null;
    return this.repository.save(product);
  }
}
