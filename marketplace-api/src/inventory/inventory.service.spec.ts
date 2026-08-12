import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InventoryService } from './inventory.service';
import { InventoryItem } from './entities/inventory-item.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

describe('InventoryService.setAvailable', () => {
  let repository: jest.Mocked<
    Pick<Repository<InventoryItem>, 'findOne' | 'save'>
  >;
  let notificationsService: jest.Mocked<Pick<NotificationsService, 'notify'>>;
  let service: InventoryService;

  function buildItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
    return {
      id: 'item-1',
      sellerId: 'seller-1',
      productId: 'product-1',
      product: { name: 'Maillot domicile' } as InventoryItem['product'],
      variantId: null,
      variant: null,
      available: 10,
      lowStockThreshold: null,
      reserved: 0,
      sold: 0,
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      save: jest.fn((item) => Promise.resolve(item as InventoryItem)),
    };
    notificationsService = { notify: jest.fn() };
    service = new InventoryService(
      repository as unknown as Repository<InventoryItem>,
      notificationsService as unknown as NotificationsService,
    );
  });

  it('throws when the inventory line does not belong to the seller', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.setAvailable('item-1', 'seller-1', 5)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates available without touching an unset threshold, no notification', async () => {
    repository.findOne.mockResolvedValue(
      buildItem({ available: 10, lowStockThreshold: null }),
    );

    const result = await service.setAvailable('item-1', 'seller-1', 3);

    expect(result.available).toBe(3);
    expect(notificationsService.notify).not.toHaveBeenCalled();
  });

  it('notifies LOW_STOCK when available crosses the threshold going down', async () => {
    repository.findOne.mockResolvedValue(
      buildItem({ available: 10, lowStockThreshold: 5 }),
    );

    const result = await service.setAvailable('item-1', 'seller-1', 4);

    expect(result.available).toBe(4);
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'seller-1',
      NotificationType.LOW_STOCK,
      expect.any(String),
      expect.stringContaining('Maillot domicile'),
    );
  });

  it('does not re-notify on every save while stock stays below the threshold', async () => {
    repository.findOne.mockResolvedValue(
      buildItem({ available: 4, lowStockThreshold: 5 }),
    );

    const result = await service.setAvailable('item-1', 'seller-1', 2);

    expect(result.available).toBe(2);
    expect(notificationsService.notify).not.toHaveBeenCalled();
  });

  it('does not notify when stock stays strictly above the threshold', async () => {
    repository.findOne.mockResolvedValue(
      buildItem({ available: 20, lowStockThreshold: 5 }),
    );

    await service.setAvailable('item-1', 'seller-1', 15);

    expect(notificationsService.notify).not.toHaveBeenCalled();
  });

  it('updates the threshold when provided, leaves it untouched when omitted', async () => {
    repository.findOne.mockResolvedValue(
      buildItem({ available: 10, lowStockThreshold: 5 }),
    );

    const result = await service.setAvailable('item-1', 'seller-1', 8, 20);

    expect(result.lowStockThreshold).toBe(20);
  });

  it('clears the threshold when explicitly set to null', async () => {
    repository.findOne.mockResolvedValue(
      buildItem({ available: 10, lowStockThreshold: 5 }),
    );

    const result = await service.setAvailable('item-1', 'seller-1', 8, null);

    expect(result.lowStockThreshold).toBeNull();
  });
});
