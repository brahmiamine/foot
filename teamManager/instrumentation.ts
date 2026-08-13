/**
 * Scheduler in-process pour la purge des commandes boutique PENDING
 * expirées — même pattern que billetterie/instrumentation.ts (voir ce
 * fichier pour le détail). register() est l'unique point d'entrée garanti
 * par Next.js pour exécuter du code une fois au démarrage du serveur Node.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const globalForScheduler = globalThis as unknown as { __shopOrderPurgeScheduler?: NodeJS.Timeout };
  if (globalForScheduler.__shopOrderPurgeScheduler) return;

  const { purgeStaleOrders } = await import("@/services/ShopOrderService");
  const intervalMs = 5 * 60 * 1000;

  const runPurge = async () => {
    try {
      const result = await purgeStaleOrders();
      if (result.releasedOrders > 0) {
        console.log(`[shop-order-purge-scheduler] ${result.releasedOrders} commande(s) libérée(s).`);
      }
    } catch (error) {
      console.error("[shop-order-purge-scheduler] échec de la purge périodique :", error);
    }
  };

  globalForScheduler.__shopOrderPurgeScheduler = setInterval(runPurge, intervalMs);
  void runPurge();

  // TASK-P0-002 : reprend les demandes de remboursement en échec et
  // rafraîchit/alerte les dossiers PAID_STOCK_UNAVAILABLE ouverts — même
  // pattern que le scheduler de purge ci-dessus (voir aussi
  // billetterie/instrumentation.ts).
  const globalForRefundScheduler = globalThis as unknown as { __stockUnavailableRefundScheduler?: NodeJS.Timeout };
  if (!globalForRefundScheduler.__stockUnavailableRefundScheduler) {
    const { processStockUnavailableRefunds } = await import("@/lib/stockUnavailableRefunds");
    const refundIntervalMs = 10 * 60 * 1000;

    const runRefundReconciliation = async () => {
      try {
        const report = await processStockUnavailableRefunds();
        if (report.retriedRequests > 0 || report.refreshed > 0 || report.alerted > 0) {
          console.log(`[stock-unavailable-refund-scheduler] ${JSON.stringify(report)}`);
        }
      } catch (error) {
        console.error("[stock-unavailable-refund-scheduler] échec du passage périodique :", error);
      }
    };

    globalForRefundScheduler.__stockUnavailableRefundScheduler = setInterval(runRefundReconciliation, refundIntervalMs);
    void runRefundReconciliation();
  }
}
