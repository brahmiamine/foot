/**
 * Scheduler in-process pour la purge des réservations PENDING expirées.
 *
 * Avant ce fichier, la seule voie pour libérer les réservations abandonnées
 * était POST /api/cron/purge-pending-reservations, appelée par un
 * ordonnanceur externe (cron système, systemd timer…) — non fourni par ce
 * dépôt (voir avancement.md). register() est l'unique point d'entrée
 * garanti par Next.js pour exécuter du code une fois au démarrage du
 * serveur Node ; on s'en sert pour armer un setInterval qui appelle la même
 * logique métier directement (pas de HTTP, pas de secret réseau). La route
 * HTTP reste disponible pour les déploiements qui préfèrent un cron externe
 * ou du multi-instance.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const globalForScheduler = globalThis as unknown as { __ticketPurgeScheduler?: NodeJS.Timeout };
  if (globalForScheduler.__ticketPurgeScheduler) return;

  const { purgeStalePendingTickets } = await import("@/lib/tickets");
  const intervalMs = 5 * 60 * 1000;

  const runPurge = async () => {
    try {
      const result = await purgeStalePendingTickets();
      if (result.releasedTickets > 0) {
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

  // TASK-P0-002 : reprend les demandes de remboursement en échec et
  // rafraîchit/alerte les dossiers PAID_STOCK_UNAVAILABLE ouverts — même
  // pattern que le scheduler de purge ci-dessus. POST
  // /api/cron/reconcile-stock-unavailable-refunds reste disponible pour un
  // ordonnanceur externe.
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

  // TASK-P0-003 : filet de sécurité pour les matchs CANCELLED — ferme la
  // vente et ouvre/reprend les dossiers de remboursement des billets déjà
  // payés (voir matchCancellationRefunds.ts). L'action synchrone déclenchée
  // par federation-hub (POST /api/internal/matches/:matchId/cancel-tickets) fait
  // déjà ce travail immédiatement ; ce scheduler rattrape le cas où cet
  // appel a échoué ou n'a jamais eu lieu (ticketing indisponible au
  // moment de l'annulation). POST /api/cron/reconcile-match-cancellation-refunds
  // reste disponible pour un ordonnanceur externe.
  const globalForMatchCancellationScheduler = globalThis as unknown as {
    __matchCancellationRefundScheduler?: NodeJS.Timeout;
  };
  if (!globalForMatchCancellationScheduler.__matchCancellationRefundScheduler) {
    const { processMatchCancellationRefunds } = await import("@/lib/matchCancellationRefunds");
    const matchCancellationIntervalMs = 10 * 60 * 1000;

    const runMatchCancellationReconciliation = async () => {
      try {
        const report = await processMatchCancellationRefunds();
        if (report.matchesScanned > 0 || report.retriedRequests > 0 || report.refreshed > 0 || report.alerted > 0) {
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
