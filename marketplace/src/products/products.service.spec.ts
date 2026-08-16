import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductStatus } from './enums/product-status.enum';

describe('ProductsService', () => {
  let repository: { findOne: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let productTxRepository: { create: jest.Mock; save: jest.Mock };
  let imageTxRepository: { create: jest.Mock; save: jest.Mock; delete: jest.Mock };
  let inventoryTxRepository: { create: jest.Mock; save: jest.Mock };
  let service: ProductsService;

  function buildProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: 'product-1', sellerId: 'seller-1', status: ProductStatus.DRAFT,
      rejectionReason: null, price: '19.990', deletedAt: null, ...overrides,
    } as Product;
  }

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      save: jest.fn((product) => Promise.resolve(product as Product)),
    };
    productTxRepository = {
      create: jest.fn((value) => ({ id: 'product-1', ...value })),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    imageTxRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    inventoryTxRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Product) return productTxRepository;
        if (entity === ProductImage) return imageTxRepository;
        if (entity === InventoryItem) return inventoryTxRepository;
        throw new Error('unexpected repository');
      }),
    };
    dataSource = { transaction: jest.fn((callback) => callback(manager)) };
    service = new ProductsService(
      repository as unknown as Repository<Product>,
      dataSource as unknown as DataSource,
    );
  });

  it('creates product, images and initial inventory in one transaction', async () => {
    const result = await service.create('seller-1', {
      name: 'Maillot', slug: 'maillot-1', sku: 'SKU-1', price: 49.9,
      images: ['https://cdn.example/a.jpg'],
    });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('product-1');
    expect(imageTxRepository.save).toHaveBeenCalled();
    expect(inventoryTxRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ sellerId: 'seller-1', productId: 'product-1', available: 0 }),
    );
  });

  it('replaces product images inside the marketplace transaction', async () => {
    const product = buildProduct();
    repository.findOne.mockResolvedValue(product);
    await service.update('product-1', 'seller-1', {
      name: 'Maillot 2',
      images: ['https://cdn.example/new.jpg'],
    });
    expect(imageTxRepository.delete).toHaveBeenCalledWith({ productId: 'product-1' });
    expect(imageTxRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ productId: 'product-1', url: 'https://cdn.example/new.jpg', position: 0 }),
    ]);
  });

  it('allows DRAFT -> SUBMITTED', async () => {
    repository.findOne.mockResolvedValue(buildProduct());
    expect((await service.sellerTransition('product-1', 'seller-1', ProductStatus.SUBMITTED)).status)
      .toBe(ProductStatus.SUBMITTED);
  });

  it('rejects a transition reserved to club moderation', async () => {
    repository.findOne.mockResolvedValue(buildProduct({ status: ProductStatus.SUBMITTED }));
    await expect(service.sellerTransition('product-1', 'seller-1', ProductStatus.APPROVED))
      .rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException when product is not owned by seller', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.sellerTransition('product-1', 'other', ProductStatus.SUBMITTED))
      .rejects.toThrow(NotFoundException);
  });
});
