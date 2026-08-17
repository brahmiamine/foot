/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { CentralNotificationsClient } from '../notifications/central-notifications.client';
import { MarketplaceClubSettings } from '../sellers/entities/marketplace-club-settings.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { ProductImage } from './entities/product-image.entity';
import { Product } from './entities/product.entity';
import { ProductStatus } from './enums/product-status.enum';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let repository: { findOne: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock; getRepository: jest.Mock };
  let productTxRepository: { create: jest.Mock; save: jest.Mock };
  let imageTxRepository: {
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let inventoryTxRepository: { create: jest.Mock; save: jest.Mock };
  let centralNotifications: { notifyClubAdmins: jest.Mock };
  let service: ProductsService;
  const buildProduct = (overrides: Partial<Product> = {}) =>
    ({
      id: 'product-1',
      sellerId: 'seller-1',
      name: 'Maillot',
      status: ProductStatus.DRAFT,
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      price: '19.990',
      deletedAt: null,
      ...overrides,
    }) as Product;
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
    const sellerRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'seller-1', clubId: 'club-1' }),
    };
    const settingsRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({
          clubId: 'club-1',
          productApprovalRequired: true,
          productReapprovalOnSensitiveChange: true,
        }),
      create: jest.fn((v) => v),
    };
    dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
      getRepository: jest.fn((entity) =>
        entity === Seller
          ? sellerRepo
          : entity === MarketplaceClubSettings
            ? settingsRepo
            : (() => {
                throw new Error('unexpected repository');
              })(),
      ),
    };
    centralNotifications = {
      notifyClubAdmins: jest.fn().mockResolvedValue(undefined),
    };
    service = new ProductsService(
      repository as unknown as Repository<Product>,
      dataSource as unknown as DataSource,
      centralNotifications as unknown as CentralNotificationsClient,
    );
  });
  it('creates product, images and initial inventory in one transaction', async () => {
    const result = await service.create('seller-1', {
      name: 'Maillot',
      slug: 'maillot-1',
      sku: 'SKU-1',
      price: 49.9,
      images: ['https://cdn.example/a.jpg'],
    });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('product-1');
    expect(imageTxRepository.save).toHaveBeenCalled();
    expect(inventoryTxRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: 'seller-1',
        productId: 'product-1',
        available: 0,
      }),
    );
  });
  it('replaces product images inside the marketplace transaction', async () => {
    const product = buildProduct();
    repository.findOne.mockResolvedValue(product);
    await service.update('product-1', 'seller-1', {
      name: 'Maillot 2',
      images: ['https://cdn.example/new.jpg'],
    });
    expect(imageTxRepository.delete).toHaveBeenCalledWith({
      productId: 'product-1',
    });
    expect(imageTxRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        productId: 'product-1',
        url: 'https://cdn.example/new.jpg',
        position: 0,
      }),
    ]);
  });
  it('keeps approval workflow and notifies club on submission', async () => {
    repository.findOne.mockResolvedValue(buildProduct());
    expect(
      (
        await service.sellerTransition(
          'product-1',
          'seller-1',
          ProductStatus.SUBMITTED,
        )
      ).status,
    ).toBe(ProductStatus.SUBMITTED);
    expect(centralNotifications.notifyClubAdmins).toHaveBeenCalled();
  });
  it('requires reapproval after a sensitive published product change', async () => {
    repository.findOne.mockResolvedValue(
      buildProduct({ status: ProductStatus.PUBLISHED }),
    );
    expect(
      (await service.update('product-1', 'seller-1', { price: 25 })).status,
    ).toBe(ProductStatus.SUBMITTED);
    expect(centralNotifications.notifyClubAdmins).toHaveBeenCalled();
  });
  it('rejects a transition reserved to club moderation', async () => {
    repository.findOne.mockResolvedValue(
      buildProduct({ status: ProductStatus.SUBMITTED }),
    );
    await expect(
      service.sellerTransition('product-1', 'seller-1', ProductStatus.APPROVED),
    ).rejects.toThrow(ConflictException);
  });
  it('throws NotFoundException when product is not owned by seller', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(
      service.sellerTransition('product-1', 'other', ProductStatus.SUBMITTED),
    ).rejects.toThrow(NotFoundException);
  });
});
