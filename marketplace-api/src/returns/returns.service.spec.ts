import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ReturnsService } from './returns.service';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnStatus } from './enums/return-status.enum';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { SellerOrderItem } from '../seller-orders/entities/seller-order-item.entity';
import { SellerOrderStatus } from '../seller-orders/enums/seller-order-status.enum';

describe('ReturnsService', () => {
  let repository: jest.Mocked<
    Pick<Repository<ReturnRequest>, 'findOne' | 'save' | 'find' | 'create'>
  >;
  let sellerOrderRepository: jest.Mocked<
    Pick<Repository<SellerOrder>, 'findOne' | 'save'>
  >;
  let sellerOrderItemRepository: jest.Mocked<
    Pick<Repository<SellerOrderItem>, 'findOne'>
  >;
  let service: ReturnsService;

  function buildOrder(overrides: Partial<SellerOrder> = {}): SellerOrder {
    return {
      id: 'order-1',
      sellerId: 'seller-1',
      status: SellerOrderStatus.DELIVERED,
      ...overrides,
    } as SellerOrder;
  }

  function buildItem(
    overrides: Partial<SellerOrderItem> = {},
  ): SellerOrderItem {
    return {
      id: 'item-1',
      sellerOrderId: 'order-1',
      ...overrides,
    } as SellerOrderItem;
  }

  function buildReturn(overrides: Partial<ReturnRequest> = {}): ReturnRequest {
    return {
      id: 'return-1',
      sellerId: 'seller-1',
      sellerOrderId: 'order-1',
      sellerOrderItemId: 'item-1',
      customerName: 'Client',
      reason: 'Taille incorrecte',
      status: ReturnStatus.REQUESTED,
      ...overrides,
    } as ReturnRequest;
  }

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((entity) => entity as ReturnRequest),
      save: jest.fn((entity) => Promise.resolve(entity as ReturnRequest)),
    };
    sellerOrderRepository = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity as SellerOrder)),
    };
    sellerOrderItemRepository = {
      findOne: jest.fn(),
    };
    service = new ReturnsService(
      repository as unknown as Repository<ReturnRequest>,
      sellerOrderRepository as unknown as Repository<SellerOrder>,
      sellerOrderItemRepository as unknown as Repository<SellerOrderItem>,
    );
  });

  describe('request (US-50)', () => {
    it('creates a REQUESTED return and moves the order to RETURN_REQUESTED when DELIVERED', async () => {
      sellerOrderRepository.findOne.mockResolvedValue(buildOrder());
      sellerOrderItemRepository.findOne.mockResolvedValue(buildItem());

      const result = await service.request({
        sellerOrderId: 'order-1',
        sellerOrderItemId: 'item-1',
        customerName: 'Client',
        reason: 'Taille incorrecte',
      });

      expect(result.status).toBe(ReturnStatus.REQUESTED);
      expect(sellerOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: SellerOrderStatus.RETURN_REQUESTED }),
      );
    });

    it('rejects a return request for an order that is not DELIVERED', async () => {
      sellerOrderRepository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.SHIPPED }),
      );
      sellerOrderItemRepository.findOne.mockResolvedValue(buildItem());

      await expect(
        service.request({
          sellerOrderId: 'order-1',
          sellerOrderItemId: 'item-1',
          customerName: 'Client',
          reason: 'x',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for an unknown order', async () => {
      sellerOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.request({
          sellerOrderId: 'order-1',
          sellerOrderItemId: 'item-1',
          customerName: 'Client',
          reason: 'x',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the item does not belong to the order', async () => {
      sellerOrderRepository.findOne.mockResolvedValue(buildOrder());
      sellerOrderItemRepository.findOne.mockResolvedValue(null);

      await expect(
        service.request({
          sellerOrderId: 'order-1',
          sellerOrderItemId: 'item-from-another-order',
          customerName: 'Client',
          reason: 'x',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('decide (US-51)', () => {
    it('approves a REQUESTED return without reverting the order status', async () => {
      repository.findOne.mockResolvedValue(buildReturn());

      const result = await service.decide('return-1', 'seller-1', true);

      expect(result.status).toBe(ReturnStatus.APPROVED);
      expect(sellerOrderRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a REQUESTED return and restores the order to DELIVERED', async () => {
      repository.findOne.mockResolvedValue(buildReturn());
      sellerOrderRepository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.RETURN_REQUESTED }),
      );

      const result = await service.decide('return-1', 'seller-1', false);

      expect(result.status).toBe(ReturnStatus.REJECTED);
      expect(sellerOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: SellerOrderStatus.DELIVERED }),
      );
    });

    it('rejects deciding on a return that is not REQUESTED', async () => {
      repository.findOne.mockResolvedValue(
        buildReturn({ status: ReturnStatus.APPROVED }),
      );

      await expect(
        service.decide('return-1', 'seller-1', true),
      ).rejects.toThrow(ConflictException);
    });

    it("never finds another seller's return request (scoped query)", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.decide('return-1', 'someone-else', true),
      ).rejects.toThrow(NotFoundException);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'return-1', sellerId: 'someone-else' },
      });
    });
  });

  describe('complete (US-52)', () => {
    it('completes an APPROVED return and moves the order to RETURNED', async () => {
      repository.findOne.mockResolvedValue(
        buildReturn({ status: ReturnStatus.APPROVED }),
      );
      sellerOrderRepository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.RETURN_REQUESTED }),
      );

      const result = await service.complete('return-1', 'seller-1');

      expect(result.status).toBe(ReturnStatus.COMPLETED);
      expect(sellerOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: SellerOrderStatus.RETURNED }),
      );
    });

    it('rejects completing a return that is not APPROVED', async () => {
      repository.findOne.mockResolvedValue(
        buildReturn({ status: ReturnStatus.REQUESTED }),
      );

      await expect(service.complete('return-1', 'seller-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
