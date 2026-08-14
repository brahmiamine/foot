import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SellerOrdersService } from './seller-orders.service';
import { SellerOrder } from './entities/seller-order.entity';
import { SellerOrderStatus } from './enums/seller-order-status.enum';

describe('SellerOrdersService', () => {
  let repository: { findOne: jest.Mock; save: jest.Mock; find: jest.Mock };
  let service: SellerOrdersService;

  function buildOrder(overrides: Partial<SellerOrder> = {}): SellerOrder {
    return {
      id: 'order-1',
      sellerId: 'seller-1',
      status: SellerOrderStatus.CONFIRMED,
      shippingCarrier: null,
      trackingNumber: null,
      shippedAt: null,
      deliveredAt: null,
      ...overrides,
    } as SellerOrder;
  }

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((order) => Promise.resolve(order as SellerOrder)),
    };
    service = new SellerOrdersService(
      repository as unknown as Repository<SellerOrder>,
    );
  });

  it('throws NotFoundException when the order does not belong to the seller', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.findOneForSeller('order-1', 'seller-1'),
    ).rejects.toThrow(NotFoundException);
  });

  describe('prepare (US-21)', () => {
    it('allows CONFIRMED -> PROCESSING', async () => {
      repository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.CONFIRMED }),
      );

      const result = await service.prepare('order-1', 'seller-1');

      expect(result.status).toBe(SellerOrderStatus.PROCESSING);
    });

    it('rejects preparation from a non-CONFIRMED status', async () => {
      repository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.PENDING }),
      );

      await expect(service.prepare('order-1', 'seller-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('markReadyToShip (US-22)', () => {
    it('allows PROCESSING -> READY_TO_SHIP', async () => {
      repository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.PROCESSING }),
      );

      const result = await service.markReadyToShip('order-1', 'seller-1');

      expect(result.status).toBe(SellerOrderStatus.READY_TO_SHIP);
    });
  });

  describe('ship (US-23)', () => {
    it('allows READY_TO_SHIP -> SHIPPED and records carrier/tracking/shippedAt', async () => {
      repository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.READY_TO_SHIP }),
      );

      const result = await service.ship('order-1', 'seller-1', {
        carrier: 'Aramex',
        trackingNumber: 'TRACK-123',
      });

      expect(result.status).toBe(SellerOrderStatus.SHIPPED);
      expect(result.shippingCarrier).toBe('Aramex');
      expect(result.trackingNumber).toBe('TRACK-123');
      expect(result.shippedAt).toBeInstanceOf(Date);
    });

    it('rejects shipping an order not READY_TO_SHIP', async () => {
      repository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.PROCESSING }),
      );

      await expect(
        service.ship('order-1', 'seller-1', {
          carrier: 'Aramex',
          trackingNumber: 'TRACK-123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('markDelivered (US-24)', () => {
    it('allows SHIPPED -> DELIVERED and records deliveredAt', async () => {
      repository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.SHIPPED }),
      );

      const result = await service.markDelivered('order-1', 'seller-1');

      expect(result.status).toBe(SellerOrderStatus.DELIVERED);
      expect(result.deliveredAt).toBeInstanceOf(Date);
    });

    it('rejects delivery before shipping', async () => {
      repository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.READY_TO_SHIP }),
      );

      await expect(
        service.markDelivered('order-1', 'seller-1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
