import { ReturnRefundReconciliationService } from './return-refund-reconciliation.service';
import { ReturnsService } from './returns.service';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnStatus } from './enums/return-status.enum';

describe('ReturnRefundReconciliationService (TASK-P0-006)', () => {
  let returnsService: jest.Mocked<
    Pick<ReturnsService, 'findPendingRefunds' | 'reconcileRefund'>
  >;
  let service: ReturnRefundReconciliationService;

  function buildReturn(overrides: Partial<ReturnRequest> = {}): ReturnRequest {
    return {
      id: 'return-1',
      status: ReturnStatus.COMPLETED,
      refundId: 'refund-1',
      refundStatus: 'MANUAL_REVIEW',
      ...overrides,
    } as ReturnRequest;
  }

  beforeEach(() => {
    returnsService = {
      findPendingRefunds: jest.fn(),
      reconcileRefund: jest.fn(),
    };
    service = new ReturnRefundReconciliationService(
      returnsService as unknown as ReturnsService,
    );
  });

  it('checks every pending refund and reports how many resolved', async () => {
    const pending = [
      buildReturn({ id: 'return-1' }),
      buildReturn({ id: 'return-2' }),
      buildReturn({ id: 'return-3' }),
    ];
    returnsService.findPendingRefunds.mockResolvedValue(pending);
    returnsService.reconcileRefund
      .mockResolvedValueOnce(true) // return-1 resolved
      .mockResolvedValueOnce(false) // return-2 still pending
      .mockResolvedValueOnce(true); // return-3 resolved

    const report = await service.reconcile();

    expect(report.checked).toBe(3);
    expect(report.resolved).toBe(2);
    expect(returnsService.reconcileRefund).toHaveBeenCalledTimes(3);
  });

  it('a failure reconciling one return does not stop the others in the batch', async () => {
    const pending = [
      buildReturn({ id: 'return-1' }),
      buildReturn({ id: 'return-2' }),
    ];
    returnsService.findPendingRefunds.mockResolvedValue(pending);
    returnsService.reconcileRefund
      .mockRejectedValueOnce(new Error('payment-api unreachable'))
      .mockResolvedValueOnce(true);

    const report = await service.reconcile();

    expect(report.checked).toBe(2);
    expect(report.resolved).toBe(1);
  });

  it('returns an empty report when nothing is pending', async () => {
    returnsService.findPendingRefunds.mockResolvedValue([]);

    const report = await service.reconcile();

    expect(report.checked).toBe(0);
    expect(report.resolved).toBe(0);
  });

  it('a reconciliation already running is not re-entered (returns the last report instead)', async () => {
    let resolveFirst!: () => void;
    returnsService.findPendingRefunds.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = () => resolve([]);
      }),
    );

    const firstRun = service.reconcile();
    const secondRun = service.reconcile();
    resolveFirst();
    await firstRun;
    const secondReport = await secondRun;

    expect(returnsService.findPendingRefunds).toHaveBeenCalledTimes(1);
    expect(secondReport.checked).toBe(0);
  });
});
