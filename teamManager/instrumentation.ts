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
}
