-- TASK-P0-005 : idempotence du webhook payments — payments retente la
-- livraison du webhook en cas d'échec réseau/timeout (voir
-- payments/src/webhooks/webhook-dispatch.service.ts, RETRY_DELAYS_MS) —
-- le même eventId peut donc arriver plusieurs fois. reconcileOrderPayment
-- est déjà idempotent sur l'état de la commande, mais rien n'empêchait de le
-- ré-exécuter à chaque retry. Cette table mémorise les eventId déjà traités
-- pour court-circuiter les retries en amont. Même pattern que
-- ticketing/sql/migration_add_processed_webhook_events.sql.
-- Nouvelle table, n'affecte aucune donnée existante.

USE foot;

CREATE TABLE IF NOT EXISTS cms_processed_webhook_events (
  event_id VARCHAR(191) NOT NULL PRIMARY KEY,
  payment_id VARCHAR(36) NOT NULL,
  processed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
