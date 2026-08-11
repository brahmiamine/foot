-- billetterie — schéma initial
-- Base MariaDB partagée "foot" (voir ../../start.sh). Tables préfixées
-- `tk_` (Ticketing) pour rester isolées des autres apps du monorepo.
-- Les UUID sont générés côté application (TypeORM `PrimaryGeneratedColumn("uuid")`),
-- pas par la base. `teams` et `matches` sont des tables partagées existantes,
-- lues en lecture seule ici — pas de FK réelle cross-connexion TypeORM vers
-- elles (comme sellerPortal), seulement une FK logique par convention.

CREATE TABLE IF NOT EXISTS tk_ticket_categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- FK logique vers teams.id — catégories définies par l'administration de
  -- chaque club (Gradin/Chaise pour OB, Virage/Tribune/VIP pour EST, ...),
  -- jamais un enum fixe partagé entre tous les clubs.
  club_id CHAR(36) NOT NULL,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  description TEXT NULL,
  base_price DECIMAL(10,3) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_tk_ticket_categories_club_slug (club_id, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tk_match_ticket_categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- FK logique vers matches.id (base partagée).
  match_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  price DECIMAL(10,3) NOT NULL,
  capacity INT NOT NULL,
  sold_count INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_tk_match_ticket_categories_match_category (match_id, category_id),
  CONSTRAINT fk_tk_match_ticket_categories_category FOREIGN KEY (category_id) REFERENCES tk_ticket_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tk_ticket_sale_rules (
  id CHAR(36) NOT NULL PRIMARY KEY,
  match_ticket_category_id CHAR(36) NOT NULL,
  allowed_audience ENUM('PUBLIC','HOME_SUPPORTERS','AWAY_SUPPORTERS') NOT NULL DEFAULT 'PUBLIC',
  max_tickets_per_user INT NOT NULL DEFAULT 4,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY idx_tk_ticket_sale_rules_mtc (match_ticket_category_id),
  CONSTRAINT fk_tk_ticket_sale_rules_mtc FOREIGN KEY (match_ticket_category_id) REFERENCES tk_match_ticket_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tk_tickets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- FK logique vers matches.id (base partagée).
  match_id CHAR(36) NOT NULL,
  match_ticket_category_id CHAR(36) NOT NULL,
  -- Club organisateur/vendeur (= matches.equipe_home au moment de l'achat),
  -- jamais le club du supporter acheteur — voir README racine § « Billetterie ».
  -- FK logique vers teams.id.
  organizer_team_id CHAR(36) NOT NULL,
  -- FK logique vers User.id (sso, rôle MEMBER) — pas de contrainte FK réelle
  -- cross-connexion (base partagée, mais TypeORM ne la déclare pas ici).
  purchaser_id VARCHAR(191) NOT NULL,
  status ENUM('PENDING','PAID','CANCELLED','USED') NOT NULL DEFAULT 'PENDING',
  reference VARCHAR(32) NOT NULL,
  price DECIMAL(10,3) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  paid_at DATETIME NULL,
  used_at DATETIME NULL,
  UNIQUE KEY uq_tk_tickets_reference (reference),
  KEY idx_tk_tickets_purchaser (purchaser_id),
  KEY idx_tk_tickets_mtc (match_ticket_category_id),
  CONSTRAINT fk_tk_tickets_mtc FOREIGN KEY (match_ticket_category_id) REFERENCES tk_match_ticket_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
