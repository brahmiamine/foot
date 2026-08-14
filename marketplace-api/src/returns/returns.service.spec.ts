import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ReturnsService } from './returns.service';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnStatus } from './enums/return-status.enum';
import { SellerOrder } from '../seller-orders/entities/seller-order.entity';
import { SellerOrderItem } from '../seller-orders/entities/seller-order-item.entity';
import { SellerOrderStatus } from '../seller-orders/enums/seller-order-status.enum';
import { MarketOrder } from '../orders/entities/market-order.entity';
import { PaymentApiClientService } from '../checkout/payment-api-client.service';
import { NotificationApiClientService } from '../checkout/notification-api-client.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

describe('ReturnsService', () => {
  let repository: {
    findOne: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
  };
  let sellerOrderRepository: { findOne: jest.Mock; save: jest.Mock };
  let sellerOrderItemRepository: jest.Mocked<
    Pick<Repository<SellerOrderItem>, 'findOne'>
  >;
  let marketOrderRepository: jest.Mocked<
    Pick<Repository<MarketOrder>, 'findOne'>
  >;
  let paymentApiClient: jest.Mocked<
    Pick<PaymentApiClientService, 'requestRefund' | 'getRefundStatus'>
  >;
  let notificationApiClient: jest.Mocked<
    Pick<NotificationApiClientService, 'notify'>
  >;
  let notificationsService: jest.Mocked<Pick<NotificationsService, 'notify'>>;
  let service: ReturnsService;

  function buildOrder(overrides: Partial<SellerOrder> = {}): SellerOrder {
    return {
      id: 'order-1',
      orderId: 'market-order-1',
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
      totalPrice: '80.000',
      ...overrides,
    } as SellerOrderItem;
  }

  function buildMarketOrder(overrides: Partial<MarketOrder> = {}): MarketOrder {
    return {
      id: 'market-order-1',
      orderNumber: 'MO-000001',
      memberId: 'member-1',
      paymentId: 'payment-1',
      ...overrides,
    } as MarketOrder;
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
      refundId: null,
      refundStatus: null,
      refundRequestedAt: null,
      refundError: null,
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
    marketOrderRepository = {
      findOne: jest.fn(),
    };
    paymentApiClient = {
      requestRefund: jest.fn(),
      getRefundStatus: jest.fn(),
    };
    notificationApiClient = {
      notify: jest.fn().mockResolvedValue(undefined),
    };
    notificationsService = {
      notify: jest.fn().mockResolvedValue(undefined),
    };
    service = new ReturnsService(
      repository as unknown as Repository<ReturnRequest>,
      sellerOrderRepository as unknown as Repository<SellerOrder>,
      sellerOrderItemRepository as unknown as Repository<SellerOrderItem>,
      marketOrderRepository as unknown as Repository<MarketOrder>,
      paymentApiClient as unknown as PaymentApiClientService,
      notificationApiClient as unknown as NotificationApiClientService,
      notificationsService as unknown as NotificationsService,
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

  describe('complete (US-52) — TASK-P0-006 : déclenche le remboursement', () => {
    function mockCompleteContext(): void {
      repository.findOne.mockResolvedValue(
        buildReturn({ status: ReturnStatus.APPROVED }),
      );
      sellerOrderRepository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.RETURN_REQUESTED }),
      );
      sellerOrderItemRepository.findOne.mockResolvedValue(buildItem());
      marketOrderRepository.findOne.mockResolvedValue(buildMarketOrder());
    }

    it('rejects completing a return that is not APPROVED', async () => {
      repository.findOne.mockResolvedValue(
        buildReturn({ status: ReturnStatus.REQUESTED }),
      );

      await expect(service.complete('return-1', 'seller-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('moves the order to RETURNED (physical receipt) before attempting any refund', async () => {
      mockCompleteContext();
      paymentApiClient.requestRefund.mockResolvedValue({
        id: 'refund-1',
        status: 'MANUAL_REVIEW',
      });

      await service.complete('return-1', 'seller-1');

      expect(sellerOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: SellerOrderStatus.RETURNED }),
      );
    });

    it('requests a refund for the exact returned line amount, with a stable idempotency key', async () => {
      mockCompleteContext();
      paymentApiClient.requestRefund.mockResolvedValue({
        id: 'refund-1',
        status: 'MANUAL_REVIEW',
      });

      await service.complete('return-1', 'seller-1');

      expect(paymentApiClient.requestRefund).toHaveBeenCalledWith({
        paymentId: 'payment-1',
        amount: 80,
        reason: 'Retour marketplace : Taille incorrecte',
        idempotencyKey: 'return:return-1',
      });
    });

    it('an immediate SUCCEEDED refund moves the return and the order to REFUNDED (financial confirmation)', async () => {
      mockCompleteContext();
      paymentApiClient.requestRefund.mockResolvedValue({
        id: 'refund-1',
        status: 'SUCCEEDED',
      });

      const result = await service.complete('return-1', 'seller-1');

      expect(result.status).toBe(ReturnStatus.REFUNDED);
      expect(sellerOrderRepository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: SellerOrderStatus.REFUNDED }),
      );
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'seller-1',
        NotificationType.RETURN_REFUNDED,
        expect.any(String),
        expect.any(String),
      );
      expect(notificationApiClient.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MARKET_RETURN_REFUNDED',
          userId: 'member-1',
        }),
      );
    });

    it('a MANUAL_REVIEW/PROCESSING refund is not treated as REFUNDED — stays COMPLETED with the refund tracked', async () => {
      mockCompleteContext();
      paymentApiClient.requestRefund.mockResolvedValue({
        id: 'refund-1',
        status: 'MANUAL_REVIEW',
      });

      const result = await service.complete('return-1', 'seller-1');

      expect(result.status).toBe(ReturnStatus.COMPLETED);
      expect(result.refundId).toBe('refund-1');
      expect(result.refundStatus).toBe('MANUAL_REVIEW');
      expect(sellerOrderRepository.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: SellerOrderStatus.REFUNDED }),
      );
      expect(notificationsService.notify).not.toHaveBeenCalled();
    });

    it('a failed refund request (payment-api unreachable) moves to REFUND_FAILED, visible with the error', async () => {
      mockCompleteContext();
      paymentApiClient.requestRefund.mockRejectedValue(
        new Error('payment-api unreachable'),
      );

      const result = await service.complete('return-1', 'seller-1');

      expect(result.status).toBe(ReturnStatus.REFUND_FAILED);
      expect(result.refundError).toBe('payment-api unreachable');
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'seller-1',
        NotificationType.RETURN_REFUND_FAILED,
        expect.any(String),
        expect.any(String),
      );
      expect(notificationApiClient.notify).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'MARKET_RETURN_REFUND_FAILED' }),
      );
    });

    it('a missing MarketOrder.paymentId is treated as a refund failure, not a crash', async () => {
      repository.findOne.mockResolvedValue(
        buildReturn({ status: ReturnStatus.APPROVED }),
      );
      sellerOrderRepository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.RETURN_REQUESTED }),
      );
      sellerOrderItemRepository.findOne.mockResolvedValue(buildItem());
      marketOrderRepository.findOne.mockResolvedValue(
        buildMarketOrder({ paymentId: null }),
      );

      const result = await service.complete('return-1', 'seller-1');

      expect(result.status).toBe(ReturnStatus.REFUND_FAILED);
      expect(paymentApiClient.requestRefund).not.toHaveBeenCalled();
    });
  });

  describe('retryRefund (TASK-P0-006) — rejeu explicite après échec', () => {
    it('rejects a retry for a return that is not REFUND_FAILED', async () => {
      repository.findOne.mockResolvedValue(
        buildReturn({ status: ReturnStatus.COMPLETED }),
      );

      await expect(service.retryRefund('return-1', 'seller-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('re-attempts the refund with the same idempotency key and clears the previous error on success', async () => {
      repository.findOne.mockResolvedValue(
        buildReturn({
          status: ReturnStatus.REFUND_FAILED,
          refundError: 'payment-api unreachable',
        }),
      );
      sellerOrderRepository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.RETURNED }),
      );
      sellerOrderItemRepository.findOne.mockResolvedValue(buildItem());
      marketOrderRepository.findOne.mockResolvedValue(buildMarketOrder());
      paymentApiClient.requestRefund.mockResolvedValue({
        id: 'refund-1',
        status: 'SUCCEEDED',
      });

      const result = await service.retryRefund('return-1', 'seller-1');

      expect(paymentApiClient.requestRefund).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: 'return:return-1' }),
      );
      expect(result.status).toBe(ReturnStatus.REFUNDED);
      expect(result.refundError).toBeNull();
    });

    it('a retry that fails again stays visible as REFUND_FAILED with the new error', async () => {
      repository.findOne.mockResolvedValue(
        buildReturn({
          status: ReturnStatus.REFUND_FAILED,
          refundError: 'first failure',
        }),
      );
      sellerOrderRepository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.RETURNED }),
      );
      sellerOrderItemRepository.findOne.mockResolvedValue(buildItem());
      marketOrderRepository.findOne.mockResolvedValue(buildMarketOrder());
      paymentApiClient.requestRefund.mockRejectedValue(
        new Error('still unreachable'),
      );

      const result = await service.retryRefund('return-1', 'seller-1');

      expect(result.status).toBe(ReturnStatus.REFUND_FAILED);
      expect(result.refundError).toBe('still unreachable');
    });
  });

  describe('reconcileRefund (TASK-P0-006) — filet de sécurité périodique', () => {
    it('does nothing if payment-api still reports the same non-terminal status', async () => {
      const returnRequest = buildReturn({
        status: ReturnStatus.COMPLETED,
        refundId: 'refund-1',
        refundStatus: 'MANUAL_REVIEW',
      });
      paymentApiClient.getRefundStatus.mockResolvedValue('MANUAL_REVIEW');

      const changed = await service.reconcileRefund(returnRequest);

      expect(changed).toBe(false);
      expect(returnRequest.status).toBe(ReturnStatus.COMPLETED);
    });

    it('resolves to REFUNDED once payment-api reports SUCCEEDED (financial confirmation)', async () => {
      const returnRequest = buildReturn({
        status: ReturnStatus.COMPLETED,
        refundId: 'refund-1',
        refundStatus: 'MANUAL_REVIEW',
      });
      paymentApiClient.getRefundStatus.mockResolvedValue('SUCCEEDED');
      sellerOrderRepository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.RETURNED }),
      );

      const changed = await service.reconcileRefund(returnRequest);

      expect(changed).toBe(true);
      expect(returnRequest.status).toBe(ReturnStatus.REFUNDED);
      expect(sellerOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: SellerOrderStatus.REFUNDED }),
      );
    });

    it('resolves to REFUND_FAILED once payment-api reports FAILED', async () => {
      const returnRequest = buildReturn({
        status: ReturnStatus.COMPLETED,
        refundId: 'refund-1',
        refundStatus: 'MANUAL_REVIEW',
      });
      paymentApiClient.getRefundStatus.mockResolvedValue('FAILED');
      sellerOrderRepository.findOne.mockResolvedValue(
        buildOrder({ status: SellerOrderStatus.RETURNED }),
      );

      const changed = await service.reconcileRefund(returnRequest);

      expect(changed).toBe(true);
      expect(returnRequest.status).toBe(ReturnStatus.REFUND_FAILED);
      expect(returnRequest.refundError).toBeTruthy();
    });

    it('is a no-op without a refundId (nothing was ever requested)', async () => {
      const returnRequest = buildReturn({ status: ReturnStatus.COMPLETED });

      const changed = await service.reconcileRefund(returnRequest);

      expect(changed).toBe(false);
      expect(paymentApiClient.getRefundStatus).not.toHaveBeenCalled();
    });
  });
});
