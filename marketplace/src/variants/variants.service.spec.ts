/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { VariantsService } from './variants.service';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';

describe('VariantsService', () => {
  let variantRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let productRepository: jest.Mocked<Pick<Repository<Product>, 'findOne'>>;
  let dataSource: { transaction: jest.Mock };
  let txVariantRepository: { create: jest.Mock; save: jest.Mock };
  let txInventoryRepository: { create: jest.Mock; save: jest.Mock };
  let service: VariantsService;

  beforeEach(() => {
    variantRepository = {
      findOne: jest.fn(),
      save: jest.fn((value) => Promise.resolve(value)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    productRepository = {
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: 'product-1',
          sellerId: 'seller-1',
        } as Product),
    };
    txVariantRepository = {
      create: jest.fn((value) => ({ id: 'variant-1', ...value })),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    txInventoryRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === ProductVariant
          ? txVariantRepository
          : entity === InventoryItem
            ? txInventoryRepository
            : undefined,
      ),
    };
    dataSource = { transaction: jest.fn((callback) => callback(manager)) };
    service = new VariantsService(
      variantRepository as unknown as Repository<ProductVariant>,
      productRepository as unknown as Repository<Product>,
      dataSource as unknown as DataSource,
    );
  });

  it('creates the variant and its initial stock atomically', async () => {
    await service.create('product-1', 'seller-1', {
      sku: 'MAILLOT-M',
      attributes: { Taille: 'M' },
      imageUrl: 'https://cdn/x.jpg',
      initialStock: 4,
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(txInventoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: 'seller-1',
        productId: 'product-1',
        variantId: 'variant-1',
        available: 4,
      }),
    );
  });

  it('rejects when the product does not belong to the seller', async () => {
    productRepository.findOne.mockResolvedValue(null);
    await expect(
      service.toggleActive('variant-1', 'product-1', 'seller-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates image and active state through Marketplace ownership', async () => {
    variantRepository.findOne.mockResolvedValue({
      id: 'variant-1',
      productId: 'product-1',
      product: {} as Product,
      sku: 'MAILLOT-M',
      attributes: { Taille: 'M' },
      price: null,
      imageUrl: null,
      isActive: true,
    } as ProductVariant);

    const result = await service.update(
      'variant-1',
      'product-1',
      'seller-1',
      {
        imageUrl: 'https://cdn/new.jpg',
        isActive: false,
      },
    );

    expect(result.imageUrl).toBe('https://cdn/new.jpg');
    expect(result.isActive).toBe(false);
  });
});
