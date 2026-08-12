import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ModerationService } from './moderation.service';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/enums/product-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

describe('ModerationService', () => {
  let productRepository: jest.Mocked<
    Pick<Repository<Product>, 'save' | 'createQueryBuilder'>
  >;
  let queryBuilder: {
    innerJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getOne: jest.Mock;
  };
  let notificationsService: jest.Mocked<Pick<NotificationsService, 'notify'>>;
  let service: ModerationService;

  function buildProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: 'product-1',
      sellerId: 'seller-1',
      name: 'Maillot domicile',
      status: ProductStatus.SUBMITTED,
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      ...overrides,
    } as Product;
  }

  beforeEach(() => {
    queryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    productRepository = {
      save: jest.fn((product) => Promise.resolve(product as Product)),
      createQueryBuilder: jest.fn(
        () => queryBuilder,
      ) as unknown as Repository<Product>['createQueryBuilder'],
    };
    notificationsService = { notify: jest.fn() };
    service = new ModerationService(
      productRepository as unknown as Repository<Product>,
      notificationsService as unknown as NotificationsService,
    );
  });

  it('rejects a transition not allowed from the current status', async () => {
    queryBuilder.getOne.mockResolvedValue(
      buildProduct({ status: ProductStatus.DRAFT }),
    );

    await expect(
      service.transition(
        'product-1',
        'club-1',
        'staff-1',
        ProductStatus.APPROVED,
      ),
    ).rejects.toThrow(ConflictException);
    expect(productRepository.save).not.toHaveBeenCalled();
  });

  it('requires a rejection reason when rejecting', async () => {
    queryBuilder.getOne.mockResolvedValue(
      buildProduct({ status: ProductStatus.UNDER_REVIEW }),
    );

    await expect(
      service.transition(
        'product-1',
        'club-1',
        'staff-1',
        ProductStatus.REJECTED,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('approves a product, stamping reviewedBy/reviewedAt and notifying the seller', async () => {
    queryBuilder.getOne.mockResolvedValue(
      buildProduct({ status: ProductStatus.UNDER_REVIEW }),
    );

    const result = await service.transition(
      'product-1',
      'club-1',
      'staff-1',
      ProductStatus.APPROVED,
    );

    expect(result.status).toBe(ProductStatus.APPROVED);
    expect(result.reviewedBy).toBe('staff-1');
    expect(result.reviewedAt).toBeInstanceOf(Date);
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'seller-1',
      NotificationType.PRODUCT_APPROVED,
      expect.any(String),
      expect.any(String),
    );
  });

  it('rejects a product with the given reason and notifies the seller', async () => {
    queryBuilder.getOne.mockResolvedValue(
      buildProduct({ status: ProductStatus.UNDER_REVIEW }),
    );

    const result = await service.transition(
      'product-1',
      'club-1',
      'staff-1',
      ProductStatus.REJECTED,
      'Photos manquantes',
    );

    expect(result.status).toBe(ProductStatus.REJECTED);
    expect(result.rejectionReason).toBe('Photos manquantes');
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'seller-1',
      NotificationType.PRODUCT_REJECTED,
      expect.any(String),
      expect.any(String),
    );
  });

  it('moves a product to review without notifying or stamping reviewedBy', async () => {
    queryBuilder.getOne.mockResolvedValue(
      buildProduct({ status: ProductStatus.SUBMITTED }),
    );

    const result = await service.transition(
      'product-1',
      'club-1',
      'staff-1',
      ProductStatus.UNDER_REVIEW,
    );

    expect(result.status).toBe(ProductStatus.UNDER_REVIEW);
    expect(result.reviewedBy).toBeNull();
    expect(notificationsService.notify).not.toHaveBeenCalled();
  });
});
