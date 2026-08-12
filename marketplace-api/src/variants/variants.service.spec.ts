import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VariantsService } from './variants.service';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';

describe('VariantsService.toggleActive', () => {
  let variantRepository: jest.Mocked<
    Pick<Repository<ProductVariant>, 'findOne' | 'save'>
  >;
  let productRepository: jest.Mocked<Pick<Repository<Product>, 'findOne'>>;
  let service: VariantsService;

  function buildVariant(
    overrides: Partial<ProductVariant> = {},
  ): ProductVariant {
    return {
      id: 'variant-1',
      productId: 'product-1',
      sku: 'MAILLOT-M',
      attributes: { Taille: 'M' },
      price: null,
      isActive: true,
      ...overrides,
    } as ProductVariant;
  }

  beforeEach(() => {
    variantRepository = {
      findOne: jest.fn(),
      save: jest.fn((variant) => Promise.resolve(variant as ProductVariant)),
    };
    productRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'product-1',
        sellerId: 'seller-1',
      }),
    };
    service = new VariantsService(
      variantRepository as unknown as Repository<ProductVariant>,
      productRepository as unknown as Repository<Product>,
    );
  });

  it('rejects when the product does not belong to the seller', async () => {
    productRepository.findOne.mockResolvedValue(null);

    await expect(
      service.toggleActive('variant-1', 'product-1', 'seller-1'),
    ).rejects.toThrow(NotFoundException);
    expect(variantRepository.save).not.toHaveBeenCalled();
  });

  it('rejects when the variant does not exist under that product', async () => {
    variantRepository.findOne.mockResolvedValue(null);

    await expect(
      service.toggleActive('variant-1', 'product-1', 'seller-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('flips isActive true -> false', async () => {
    variantRepository.findOne.mockResolvedValue(
      buildVariant({ isActive: true }),
    );

    const result = await service.toggleActive(
      'variant-1',
      'product-1',
      'seller-1',
    );

    expect(result.isActive).toBe(false);
  });

  it('flips isActive false -> true', async () => {
    variantRepository.findOne.mockResolvedValue(
      buildVariant({ isActive: false }),
    );

    const result = await service.toggleActive(
      'variant-1',
      'product-1',
      'seller-1',
    );

    expect(result.isActive).toBe(true);
  });
});
