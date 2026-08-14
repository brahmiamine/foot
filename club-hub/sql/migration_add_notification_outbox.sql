-- TS-25/TS-26 (avancement.md, Epic E07) : outbox transactionnel pour les
-- notifications déclenchées par club-hub, sur le modèle de
-- payment_outbox_events (payments, TS-12/TS-13) — l'écriture métier et
-- l'événement outbox committent ensemble ou aucun des deux, un appel à
-- notifications qui échoue est rejoué selon un calendrier durable
-- (1min -> 5min -> 15min -> 1h -> 6h -> FAILED) plutôt que perdu au premier
-- échec réseau. Additive, n'affecte aucune donnée existante.

USE foot;

CREATE TABLE IF NOT EXISTS notification_outbox_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- Clé d'idempotence transmise telle quelle à notifications.
  event_id VARCHAR(191) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('PENDING','PROCESSED','FAILED') NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  next_retry_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  processed_at DATETIME(6) NULL,
  last_error VARCHAR(500) NULL,
  UNIQUE KEY uq_notification_outbox_events_event_id (event_id),
  INDEX idx_notification_outbox_events_status_retry (status, next_retry_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
