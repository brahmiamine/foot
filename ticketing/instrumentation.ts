/**
 * Schedulers de réconciliation ticketing.
 *
 * Les timers restent locaux au process, mais chaque exécution métier est
 * protégée par un verrou distribué MariaDB afin d'éviter les doublons entre
 * plusieurs replicas.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runWithSchedulerLock } = await import("@/lib/scheduler-lock");

  const globalForScheduler = globalThis as unknown as { __ticketPurgeScheduler?: NodeJS.Timeout };
  if (globalForScheduler.__ticketPurgeScheduler) return;

  const { purgeStalePendingTickets } = await import("@/lib/tickets");
  const intervalMs = 5 * 60 * 1000;

  const runPurge = async () => {
    try {
      const execution = await runWithSchedulerLock("foot:ticketing:pending-ticket-purge", purgeStalePendingTickets);
      const result = execution.value;
      if (execution.ran && result && result.releasedTickets > 0) {
        console.log(
          `[ticket-purge-scheduler] ${result.releasedTickets} billet(s) libéré(s) sur ${result.releasedCategories} catégorie(s).`
        );
      }
    } catch (error) {
      console.error("[ticket-purge-scheduler] échec de la purge périodique :", error);
    }
  };

  globalForScheduler.__ticketPurgeScheduler = setInterval(runPurge, intervalMs);
  void runPurge();

  const globalForRefundScheduler = globalThis as unknown as { __stockUnavailableRefundScheduler?: NodeJS.Timeout };
  if (!globalForRefundScheduler.__stockUnavailableRefundScheduler) {
    const { processStockUnavailableRefunds } = await import("@/lib/stockUnavailableRefunds");
    const refundIntervalMs = 10 * 60 * 1000;

    const runRefundReconciliation = async () => {
      try {
        const execution = await runWithSchedulerLock(
          "foot:ticketing:stock-unavailable-refunds",
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

  const globalForMatchCancellationScheduler = globalThis as unknown as {
    __matchCancellationRefundScheduler?: NodeJS.Timeout;
  };
  if (!globalForMatchCancellationScheduler.__matchCancellationRefundScheduler) {
    const { processMatchCancellationRefunds } = await import("@/lib/matchCancellationRefunds");
    const matchCancellationIntervalMs = 10 * 60 * 1000;

    const runMatchCancellationReconciliation = async () => {
      try {
        const execution = await runWithSchedulerLock(
          "foot:ticketing:match-cancellation-refunds",
          processMatchCancellationRefunds,
        );
        const report = execution.value;
        if (
          execution.ran &&
          report &&
          (report.matchesScanned > 0 || report.retriedRequests > 0 || report.refreshed > 0 || report.alerted > 0)
        ) {
          console.log(`[match-cancellation-refund-scheduler] ${JSON.stringify(report)}`);
        }
      } catch (error) {
        console.error("[match-cancellation-refund-scheduler] échec du passage périodique :", error);
      }
    };

    globalForMatchCancellationScheduler.__matchCancellationRefundScheduler = setInterval(
      runMatchCancellationReconciliation,
      matchCancellationIntervalMs,
    );
    void runMatchCancellationReconciliation();
  }
}
