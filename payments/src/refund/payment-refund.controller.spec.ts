import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentRefundController } from './payment-refund.controller';

function buildRefundService() {
  return {
    createRefund: jest.fn(),
    listForPayment: jest.fn(),
    getRemainingRefundable: jest.fn(),
  };
}

describe('PaymentRefundController service ownership', () => {
  const service = { application: 'ticketing' };

  it('blocks a refund when the payment does not belong to the authenticated service', async () => {
    const refundService = buildRefundService();
    const paymentRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const controller = new PaymentRefundController(
      refundService as never,
      paymentRepository as never,
    );

    await expect(
      controller.create(
        '11111111-1111-4111-8111-111111111111',
        { reason: 'attempted cross-service refund' },
        service,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(refundService.createRefund).not.toHaveBeenCalled();
  });

  it('passes the authenticated service and trusted actor header to RefundService', async () => {
    const refundService = buildRefundService();
    refundService.createRefund.mockResolvedValue({ id: 'refund-1' });
    const paymentRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        callerApplication: 'ticketing',
      }),
    };
    const controller = new PaymentRefundController(
      refundService as never,
      paymentRepository as never,
    );

    await controller.create(
      '11111111-1111-4111-8111-111111111111',
      { reason: 'legitimate refund', initiatedByUser: 'body-spoof' },
      service,
      'idem-1',
      ' user-42 ',
    );

    expect(refundService.createRefund).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      { reason: 'legitimate refund', initiatedByUser: 'body-spoof' },
      'ticketing',
      'idem-1',
      'user-42',
    );
  });

  it('rejects a malformed trusted actor header', async () => {
    const refundService = buildRefundService();
    const paymentRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        callerApplication: 'ticketing',
      }),
    };
    const controller = new PaymentRefundController(
      refundService as never,
      paymentRepository as never,
    );

    await expect(
      controller.create(
        '11111111-1111-4111-8111-111111111111',
        { reason: 'legitimate refund' },
        service,
        undefined,
        '   ',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(refundService.createRefund).not.toHaveBeenCalled();
  });

  it('requires a human actor when federation-hub initiates a refund', async () => {
    const refundService = buildRefundService();
    const paymentRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        callerApplication: 'federation-hub',
      }),
    };
    const controller = new PaymentRefundController(
      refundService as never,
      paymentRepository as never,
    );

    await expect(
      controller.create(
        '11111111-1111-4111-8111-111111111111',
        { reason: 'federation refund' },
        { application: 'federation-hub' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(refundService.createRefund).not.toHaveBeenCalled();
  });
});
