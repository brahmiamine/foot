import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ProductStatus } from './enums/product-status.enum';

describe('ProductsService', () => {
  let repository: jest.Mocked<
    Pick<Repository<Product>, 'findOne' | 'save' | 'remove'>
  >;
  let service: ProductsService;

  function buildProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: 'product-1',
      sellerId: 'seller-1',
      status: ProductStatus.DRAFT,
      rejectionReason: null,
      ...overrides,
    } as Product;
  }

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      save: jest.fn((product) => Promise.resolve(product as Product)),
      remove: jest.fn(),
    };
    service = new ProductsService(repository as unknown as Repository<Product>);
  });

  describe('sellerTransition', () => {
    it('allows DRAFT -> SUBMITTED', async () => {
      repository.findOne.mockResolvedValue(
        buildProduct({ status: ProductStatus.DRAFT }),
      );

      const result = await service.sellerTransition(
        'product-1',
        'seller-1',
        ProductStatus.SUBMITTED,
      );

      expect(result.status).toBe(ProductStatus.SUBMITTED);
    });

    it('rejects a transition reserved to club moderation (e.g. SUBMITTED -> APPROVED)', async () => {
      repository.findOne.mockResolvedValue(
        buildProduct({ status: ProductStatus.SUBMITTED }),
      );

      await expect(
        service.sellerTransition(
          'product-1',
          'seller-1',
          ProductStatus.APPROVED,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('clears the rejection reason when moving REJECTED -> DRAFT', async () => {
      repository.findOne.mockResolvedValue(
        buildProduct({
          status: ProductStatus.REJECTED,
          rejectionReason: 'Photos manquantes',
        }),
      );

      const result = await service.sellerTransition(
        'product-1',
        'seller-1',
        ProductStatus.DRAFT,
      );

      expect(result.status).toBe(ProductStatus.DRAFT);
      expect(result.rejectionReason).toBeNull();
    });

    it('throws NotFoundException when the product does not belong to the seller', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.sellerTransition(
          'product-1',
          'someone-else',
          ProductStatus.SUBMITTED,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('rejects editing a product under moderation (SUBMITTED)', async () => {
      repository.findOne.mockResolvedValue(
        buildProduct({ status: ProductStatus.SUBMITTED }),
      );

      await expect(
        service.update('product-1', 'seller-1', { name: 'Nouveau nom' }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows editing a DRAFT product', async () => {
      repository.findOne.mockResolvedValue(
        buildProduct({ status: ProductStatus.DRAFT }),
      );

      const result = await service.update('product-1', 'seller-1', {
        name: 'Nouveau nom',
      });

      expect(result.name).toBe('Nouveau nom');
    });
  });

  describe('remove', () => {
    it('rejects deleting a non-DRAFT product', async () => {
      repository.findOne.mockResolvedValue(
        buildProduct({ status: ProductStatus.PUBLISHED }),
      );

      await expect(service.remove('product-1', 'seller-1')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('deletes a DRAFT product', async () => {
      const product = buildProduct({ status: ProductStatus.DRAFT });
      repository.findOne.mockResolvedValue(product);

      await service.remove('product-1', 'seller-1');

      expect(repository.remove).toHaveBeenCalledWith(product);
    });
  });
});
