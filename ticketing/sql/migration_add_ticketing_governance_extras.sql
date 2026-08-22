-- TICK-003 à TICK-008 (platform-governance-roadmap.md, section Ticketing) :
-- billets invitations/gratuits, appareils scanner, politique d'entrée
-- stade, transfert de billet, abonnements saison, promotions. Additive et
-- legacy-safe : toute nouvelle policy sur tk_governance_settings a une
-- valeur par défaut qui désactive le nouveau comportement (comp_quota=0,
-- transfer_enabled=0, gate_*=NULL, promotion_approval_required=1).

-- TICK-003 — quota de billets gratuits/invitations par offre match+catégorie.
ALTER TABLE tk_ticket_sale_rules
  ADD COLUMN comp_quota INT NOT NULL DEFAULT 0 AFTER max_tickets_per_user;

CREATE TABLE IF NOT EXISTS tk_ticket_grants (
  id CHAR(36) PRIMARY KEY,
  match_ticket_category_id CHAR(36) NOT NULL,
  requested_by_user_id VARCHAR(191) NOT NULL,
  recipient_name VARCHAR(191) NOT NULL,
  recipient_email VARCHAR(255) NULL,
  quantity INT NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  approved_by_user_id VARCHAR(191) NULL,
  approved_at DATETIME NULL,
  rejection_reason TEXT NULL,
  ticket_ids JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tk_ticket_grants_mtc_status (match_ticket_category_id, status),
  KEY idx_tk_ticket_grants_requester (requested_by_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TICK-004 — appareils scanner : révocation, version de clé, dernière synchro.
CREATE TABLE IF NOT EXISTS tk_scan_devices (
  id CHAR(36) PRIMARY KEY,
  club_id CHAR(36) NOT NULL,
  label VARCHAR(191) NOT NULL,
  secret_hash CHAR(64) NOT NULL,
  key_version INT NOT NULL DEFAULT 1,
  revoked TINYINT NOT NULL DEFAULT 0,
  revoked_at DATETIME NULL,
  revoked_by_user_id VARCHAR(191) NULL,
  registered_by_user_id VARCHAR(191) NOT NULL,
  last_sync_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tk_scan_devices_club (club_id, revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TICK-005 — fenêtre d'ouverture/fermeture des gates et validité du
-- manifeste hors-ligne ; NULL préserve le comportement historique (aucune
-- fenêtre, aucune expiration).
ALTER TABLE tk_governance_settings
  ADD COLUMN gate_open_minutes_before_kickoff INT NULL AFTER price_reapproval_required,
  ADD COLUMN gate_close_minutes_after_kickoff INT NULL AFTER gate_open_minutes_before_kickoff,
  ADD COLUMN offline_manifest_validity_minutes INT NULL AFTER gate_close_minutes_after_kickoff,
  -- TICK-006 — transfert de billet.
  ADD COLUMN transfer_enabled TINYINT NOT NULL DEFAULT 0 AFTER offline_manifest_validity_minutes,
  ADD COLUMN transfer_deadline_hours_before_kickoff INT NOT NULL DEFAULT 24 AFTER transfer_enabled,
  ADD COLUMN max_transfers_per_ticket INT NOT NULL DEFAULT 1 AFTER transfer_deadline_hours_before_kickoff,
  -- TICK-007 — durée par défaut d'un abonnement saison lors du renouvellement.
  ADD COLUMN season_pass_duration_days INT NOT NULL DEFAULT 365 AFTER max_transfers_per_ticket,
  -- TICK-008 — une promotion doit être approuvée avant d'être utilisable
  -- (même maker/checker que la vente elle-même) sauf si désactivé.
  ADD COLUMN promotion_approval_required TINYINT NOT NULL DEFAULT 1 AFTER season_pass_duration_days;

-- TICK-006 — transferts de billet, une ligne par transfert (jamais mutée
-- rétroactivement au-delà de sa propre progression de statut).
CREATE TABLE IF NOT EXISTS tk_ticket_transfers (
  id CHAR(36) PRIMARY KEY,
  ticket_id CHAR(36) NOT NULL,
  from_purchaser_id VARCHAR(191) NOT NULL,
  to_email VARCHAR(255) NOT NULL,
  to_purchaser_id VARCHAR(191) NULL,
  status ENUM('PENDING','ACCEPTED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  requested_at DATETIME NOT NULL,
  deadline DATETIME NOT NULL,
  activated_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  cancelled_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tk_ticket_transfers_ticket (ticket_id, status),
  KEY idx_tk_ticket_transfers_to_email (to_email, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TICK-007 — abonnements saison (entitlement multi-match par catégorie) et
-- leurs consommations, une ligne par match couvert pour empêcher un double
-- retrait sur le même match.
CREATE TABLE IF NOT EXISTS tk_season_passes (
  id CHAR(36) PRIMARY KEY,
  club_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  purchaser_id VARCHAR(191) NOT NULL,
  status ENUM('ACTIVE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  starts_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  renewed_from_id CHAR(36) NULL,
  price DECIMAL(10,3) NOT NULL,
  payment_id VARCHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tk_season_passes_purchaser (purchaser_id, status),
  KEY idx_tk_season_passes_category (category_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tk_season_pass_redemptions (
  id CHAR(36) PRIMARY KEY,
  season_pass_id CHAR(36) NOT NULL,
  match_ticket_category_id CHAR(36) NOT NULL,
  ticket_id CHAR(36) NOT NULL,
  redeemed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tk_season_pass_redemption (season_pass_id, match_ticket_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TICK-008 — promotions à code, tarification contrôlée et auditée
-- (maker/checker, jamais appliquées avant approbation si
-- promotion_approval_required). Le "package" multi-catégories reste hors
-- périmètre de ce lot (une promotion cible une seule offre match+catégorie).
CREATE TABLE IF NOT EXISTS tk_ticket_promotions (
  id CHAR(36) PRIMARY KEY,
  match_ticket_category_id CHAR(36) NOT NULL,
  code VARCHAR(64) NOT NULL,
  discount_type ENUM('PERCENTAGE','FIXED_AMOUNT') NOT NULL,
  discount_value DECIMAL(10,3) NOT NULL,
  max_uses INT NULL,
  used_count INT NOT NULL DEFAULT 0,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  status ENUM('DRAFT','APPROVED') NOT NULL DEFAULT 'DRAFT',
  created_by VARCHAR(191) NOT NULL,
  approved_by VARCHAR(191) NULL,
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tk_ticket_promotions_code (match_ticket_category_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TICK-005 — nouvel outcome de scan pour un accès refusé par la fenêtre de gates.
ALTER TABLE tk_ticket_scans
  MODIFY COLUMN result ENUM('SUCCESS','ALREADY_USED','NOT_PAID','MATCH_CANCELLED','INVALID','REVOKED','GATE_CLOSED') NOT NULL;

-- Traçabilité de l'origine d'un billet (achat / don-invitation / abonnement
-- saison / promotion appliquée) et compteur de transferts déjà effectués.
ALTER TABLE tk_tickets
  ADD COLUMN source ENUM('PURCHASE','GRANT','SEASON_PASS') NOT NULL DEFAULT 'PURCHASE' AFTER price,
  ADD COLUMN grant_id CHAR(36) NULL AFTER source,
  ADD COLUMN season_pass_id CHAR(36) NULL AFTER grant_id,
  ADD COLUMN promotion_id CHAR(36) NULL AFTER season_pass_id,
  ADD COLUMN transfer_count INT NOT NULL DEFAULT 0 AFTER promotion_id;
