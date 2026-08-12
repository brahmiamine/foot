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
}
