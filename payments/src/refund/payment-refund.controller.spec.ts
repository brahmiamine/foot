import { NotFoundException } from '@nestjs/common';
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

    expect(paymentRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: '11111111-1111-4111-8111-111111111111',
        callerApplication: 'ticketing',
      },
    });
    expect(refundService.createRefund).not.toHaveBeenCalled();
  });

  it('keeps legitimate same-service refunds working', async () => {
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
      { reason: 'legitimate refund' },
      service,
      'idem-1',
    );

    expect(refundService.createRefund).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      { reason: 'legitimate refund' },
      'ticketing',
      'idem-1',
    );
  });
});
