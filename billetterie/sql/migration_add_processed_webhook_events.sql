-- Idempotence du webhook payment-api (avancement.md, TS-14) : payment-api
-- retente la livraison du webhook en cas d'échec réseau/timeout (voir
-- payment-api/src/webhooks/webhook-dispatch.service.ts, RETRY_DELAYS_MS) —
-- le même eventId peut donc arriver plusieurs fois. reconcileTicketPayment
-- est déjà idempotent sur l'état des billets (voir src/lib/tickets.ts), mais
-- rien n'empêchait de le ré-exécuter à chaque retry. Cette table mémorise
-- les eventId déjà traités pour court-circuiter les retries en amont.
-- Nouvelle table, n'affecte aucune donnée existante.

USE foot;

CREATE TABLE IF NOT EXISTS tk_processed_webhook_events (
  event_id VARCHAR(191) NOT NULL PRIMARY KEY,
  payment_id VARCHAR(36) NOT NULL,
  processed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
