-- Enrichit l'audit des actions sensibles avec le terminal client.
-- Additive et nullable : les entrées historiques restent valides.

USE foot;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS user_agent VARCHAR(512) NULL AFTER ip_address;
