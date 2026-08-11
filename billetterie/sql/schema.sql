-- billetterie — schéma initial
-- Base MariaDB partagée "foot" (voir ../../start.sh). Tables préfixées
-- `tk_` (Ticketing) pour rester isolées des autres apps du monorepo.
-- Réutilise la table `matches` déjà partagée (superadmin/teamManager) comme
-- "événement" — pas de table Event dupliquée, voir README racine section
-- « Billetterie : séparer l'identité du supporter de l'organisateur de
-- l'événement ». Les UUID sont générés côté application (TypeORM
-- `PrimaryGeneratedColumn("uuid")`), pas par la base.

-- Catégories de billets définies par club (ex. OB : Gradin/Chaise ; EST :
-- Virage/Tribune/VIP) — jamais un enum fixe dans le code.
CREATE TABLE IF NOT EXISTS tk_ticket_categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  clubId CHAR(36) NOT NULL COMMENT 'FK logique vers teams.id (base foot partagée)',
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  description TEXT NULL,
  basePrice DECIMAL(10,3) NOT NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_tk_ticket_categories_club_slug (clubId, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Quelle catégorie est vendue pour quel match, à quel prix/quota. Une même
-- définition de catégorie (ex. "Gradin") peut avoir un prix différent selon
-- l'affiche du match.
CREATE TABLE IF NOT EXISTS tk_match_ticket_categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  matchId CHAR(36) NOT NULL COMMENT 'FK logique vers matches.id (base foot partagée)',
  categoryId CHAR(36) NOT NULL,
  price DECIMAL(10,3) NOT NULL,
  capacity INT NOT NULL,
  soldCount INT NOT NULL DEFAULT 0,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_tk_match_ticket_categories (matchId, categoryId),
  CONSTRAINT fk_tk_mtc_category FOREIGN KEY (categoryId) REFERENCES tk_ticket_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Restriction d'audience par match+catégorie (TicketSaleRule) — ex. une
-- tribune réservée aux seuls supporters de l'équipe visiteuse. Le club
-- organisateur décide, pas le club favori de l'acheteur (voir README).
CREATE TABLE IF NOT EXISTS tk_ticket_sale_rules (
  id CHAR(36) NOT NULL PRIMARY KEY,
  matchTicketCategoryId CHAR(36) NOT NULL,
  allowedAudience ENUM('PUBLIC','HOME_SUPPORTERS','AWAY_SUPPORTERS') NOT NULL DEFAULT 'PUBLIC',
  maxTicketsPerUser INT NOT NULL DEFAULT 4,
  startsAt DATETIME NULL,
  endsAt DATETIME NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_tk_sale_rule_mtc (matchTicketCategoryId),
  CONSTRAINT fk_tk_sale_rule_mtc FOREIGN KEY (matchTicketCategoryId) REFERENCES tk_match_ticket_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tk_tickets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  matchId CHAR(36) NOT NULL COMMENT 'FK logique vers matches.id (base foot partagée)',
  matchTicketCategoryId CHAR(36) NOT NULL,
  organizerTeamId CHAR(36) NOT NULL COMMENT 'Copie de matches.equipe_home au moment de l''achat : le club organisateur, pas l''acheteur',
  purchaserId VARCHAR(191) NOT NULL COMMENT 'FK logique vers User.id (sso, role MEMBER)',
  status ENUM('PENDING','PAID','CANCELLED','USED') NOT NULL DEFAULT 'PENDING',
  reference VARCHAR(32) NOT NULL,
  price DECIMAL(10,3) NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  paidAt DATETIME(6) NULL,
  usedAt DATETIME(6) NULL,
  UNIQUE KEY uq_tk_tickets_reference (reference),
  KEY idx_tk_tickets_purchaser (purchaserId),
  KEY idx_tk_tickets_match (matchId),
  CONSTRAINT fk_tk_tickets_mtc FOREIGN KEY (matchTicketCategoryId) REFERENCES tk_match_ticket_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
