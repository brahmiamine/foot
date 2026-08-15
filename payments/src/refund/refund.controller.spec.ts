import { BadRequestException } from '@nestjs/common';
import { RefundController } from './refund.controller';
import { RefundStatus } from './enums/refund-status.enum';

function buildService() {
  return {
    listByStatus: jest.fn(),
    findById: jest.fn(),
    getHistory: jest.fn(),
    retryRefund: jest.fn(),
    confirmManualRefund: jest.fn(),
    rejectManualRefund: jest.fn(),
  };
}

describe('RefundController operator identity', () => {
  it('uses the authenticated backend operator header instead of body identity', async () => {
    const service = buildService();
    service.confirmManualRefund.mockResolvedValue({
      status: RefundStatus.SUCCEEDED,
    });
    const controller = new RefundController(service as never);

    await controller.confirm(
      '11111111-1111-4111-8111-111111111111',
      { resolvedByUser: 'spoofed-body-user', note: 'manual transfer' },
      'trusted-user-42',
    );

    expect(service.confirmManualRefund).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      { resolvedByUser: 'trusted-user-42', note: 'manual transfer' },
    );
  });

  it('rejects financial mutations without an operator user assertion', async () => {
    const service = buildService();
    const controller = new RefundController(service as never);

    await expect(
      controller.reject(
        '11111111-1111-4111-8111-111111111111',
        { resolvedByUser: 'body-user', note: 'reject refund' },
        undefined,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.rejectManualRefund).not.toHaveBeenCalled();
  });
});
