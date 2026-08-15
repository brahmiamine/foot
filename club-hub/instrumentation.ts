/**
 * Schedulers de réconciliation démarrés une fois par process Next.js.
 *
 * Plusieurs replicas peuvent exister en production : chaque exécution métier
 * est donc protégée par un verrou distribué MariaDB pour éviter les doublons.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runWithSchedulerLock } = await import("@/lib/scheduler-lock");

  const globalForScheduler = globalThis as unknown as { __shopOrderPurgeScheduler?: NodeJS.Timeout };
  if (globalForScheduler.__shopOrderPurgeScheduler) return;

  const { purgeStaleOrders } = await import("@/services/ShopOrderService");
  const intervalMs = 5 * 60 * 1000;

  const runPurge = async () => {
    try {
      const execution = await runWithSchedulerLock("foot:club-hub:shop-order-purge", purgeStaleOrders);
      if (execution.ran && execution.value && execution.value.releasedOrders > 0) {
        console.log(`[shop-order-purge-scheduler] ${execution.value.releasedOrders} commande(s) libérée(s).`);
      }
    } catch (error) {
      console.error("[shop-order-purge-scheduler] échec de la purge périodique :", error);
    }
  };

  globalForScheduler.__shopOrderPurgeScheduler = setInterval(runPurge, intervalMs);
  void runPurge();

  const globalForRefundScheduler = globalThis as unknown as { __stockUnavailableRefundScheduler?: NodeJS.Timeout };
  if (!globalForRefundScheduler.__stockUnavailableRefundScheduler) {
    const { processStockUnavailableRefunds } = await import("@/lib/stockUnavailableRefunds");
    const refundIntervalMs = 10 * 60 * 1000;

    const runRefundReconciliation = async () => {
      try {
        const execution = await runWithSchedulerLock(
          "foot:club-hub:stock-unavailable-refunds",
          processStockUnavailableRefunds,
        );
        const report = execution.value;
        if (execution.ran && report && (report.retriedRequests > 0 || report.refreshed > 0 || report.alerted > 0)) {
          console.log(`[stock-unavailable-refund-scheduler] ${JSON.stringify(report)}`);
        }
      } catch (error) {
        console.error("[stock-unavailable-refund-scheduler] échec du passage périodique :", error);
      }
    };

    globalForRefundScheduler.__stockUnavailableRefundScheduler = setInterval(runRefundReconciliation, refundIntervalMs);
    void runRefundReconciliation();
  }

  const globalForConvocationScheduler = globalThis as unknown as {
    __convocationCancellationScheduler?: NodeJS.Timeout;
  };
  if (!globalForConvocationScheduler.__convocationCancellationScheduler) {
    const { ConvocationService } = await import("@/services/ConvocationService");
    const convocationIntervalMs = 10 * 60 * 1000;

    const runConvocationReconciliation = async () => {
      try {
        const execution = await runWithSchedulerLock(
          "foot:club-hub:cancelled-match-convocations",
          () => new ConvocationService().reconcileCancelledMatches(),
        );
        const report = execution.value;
        if (execution.ran && report && report.matchesScanned > 0) {
          console.log(`[convocation-cancellation-scheduler] ${JSON.stringify(report)}`);
        }
      } catch (error) {
        console.error("[convocation-cancellation-scheduler] échec du passage périodique :", error);
      }
    };

    globalForConvocationScheduler.__convocationCancellationScheduler = setInterval(
      runConvocationReconciliation,
      convocationIntervalMs,
    );
    void runConvocationReconciliation();
  }
}
