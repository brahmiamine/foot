-- Phase 5 : notifications (#26). Vraies notifications navigateur (Web
-- Push, standard ouvert — pas besoin de compte/service tiers payant,
-- contrairement à la billetterie/boutique qui attend Stripe). L'envoi
-- programmé (coup d'envoi, nouveau contenu) passe par un endpoint appelé
-- par un cron externe — voir ob/src/app/api/cron/tick/route.ts.

USE foot;

CREATE TABLE ob_notification_prefs (
  user_id VARCHAR(191) NOT NULL PRIMARY KEY,
  matches TINYINT(1) NOT NULL DEFAULT 1,
  results TINYINT(1) NOT NULL DEFAULT 1,
  news TINYINT(1) NOT NULL DEFAULT 1,
  women_team TINYINT(1) NOT NULL DEFAULT 0,
  youth TINYINT(1) NOT NULL DEFAULT 0,
  favorite_players TINYINT(1) NOT NULL DEFAULT 1,
  shop TINYINT(1) NOT NULL DEFAULT 0,
  ticketing TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ob_notification_prefs_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ob_push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ob_push_endpoint (endpoint),
  KEY idx_ob_push_subscriptions_user (user_id),
  CONSTRAINT fk_ob_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dédoublonnage des rappels de coup d'envoi (un seul push par match).
CREATE TABLE ob_kickoff_notified (
  match_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci NOT NULL PRIMARY KEY,
  notified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Curseur "dernière vérification" par type d'évènement, pour que le tick
-- cron ne renotifie pas deux fois le même but/résultat/contenu.
CREATE TABLE ob_notification_cursor (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  last_checked_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
