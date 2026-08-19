-- GOV-008 — moteur commun SLA/reminders/escalations pour les workflows réglementaires.
-- Le seuil d'escalade est distinct de l'échéance. Pour les policies existantes,
-- NULL conserve un fallback applicatif overdue_after_hours + 24h.
ALTER TABLE regulatory_sla_policies
  ADD COLUMN IF NOT EXISTS escalation_after_hours INT NULL AFTER overdue_after_hours,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1 AFTER escalation_after_hours;

CREATE TABLE IF NOT EXISTS regulatory_sla_alert_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL,
  federation_id CHAR(36) NOT NULL,
  league_id CHAR(36) NULL,
  domain VARCHAR(64) NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  stage ENUM('REMINDER','ESCALATION') NOT NULL,
  cycle_started_at DATETIME NOT NULL,
  policy_version INT NULL,
  status ENUM('PENDING','PROCESSING','SENT') NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  locked_at DATETIME NULL,
  sent_at DATETIME NULL,
  last_error VARCHAR(2000) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_regulatory_sla_alert_event_id (event_id),
  KEY idx_regulatory_sla_alert_dispatch (status, locked_at),
  KEY idx_regulatory_sla_alert_entity (federation_id, domain, entity_id, cycle_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
