-- Migration: ajout des fonctionnalités Notifications, Convocations, Boutique
-- (catégories/produits) et Sponsors (demandes de partenariat + dossiers actifs).
-- Tables additives cms_*, scopées par team_id (CHAR36 -> teams.id), suivant
-- la même convention que migration_cms_unification.sql.

USE foot;

-- Notifications diffusées par le club (annonces admin, éventuellement liées
-- à un match — ex. envoi d'une convocation).
CREATE TABLE cms_notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  target_type ENUM('ALL','PLAYERS','STAFF','TEAM_MEMBERS') NOT NULL DEFAULT 'ALL',
  match_id CHAR(36) NULL,
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_notifications_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_notifications_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL,
  INDEX idx_cms_notifications_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Convocations : joueurs convoqués pour un match + suivi de présence.
CREATE TABLE cms_convocations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  match_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) NOT NULL,
  response ENUM('PENDING','PRESENT','ABSENT') NOT NULL DEFAULT 'PENDING',
  notes VARCHAR(255) NULL,
  notified_at DATETIME NULL,
  responded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_convocations_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_convocations_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_convocations_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_convocations_match_player UNIQUE (match_id, player_id),
  INDEX idx_cms_convocations_team (team_id),
  INDEX idx_cms_convocations_match (match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Boutique : catégories de produits.
CREATE TABLE cms_product_categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  name_fr VARCHAR(150) NOT NULL,
  name_ar VARCHAR(150) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_product_categories_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_product_categories_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Boutique : produits (stock + prix, sans paiement ni commandes en V1).
CREATE TABLE cms_products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  category_id BIGINT NULL,
  name_fr VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200) NULL,
  description_fr TEXT NULL,
  description_ar TEXT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  image_url VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_products_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_products_category FOREIGN KEY (category_id) REFERENCES cms_product_categories(id) ON DELETE SET NULL,
  INDEX idx_cms_products_team (team_id),
  INDEX idx_cms_products_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Sponsors : demandes de partenariat soumises via le formulaire public
-- (une entreprise qui souhaite devenir sponsor du club).
CREATE TABLE cms_sponsor_requests (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  company_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(30) NULL,
  website VARCHAR(255) NULL,
  logo_url VARCHAR(255) NULL,
  logo_size ENUM('SMALL','MEDIUM','LARGE') NULL,
  proposed_level ENUM('OR','ARGENT','BRONZE','LOCAL') NULL,
  message TEXT NULL,
  status ENUM('PENDING','ACCEPTED','REFUSED') NOT NULL DEFAULT 'PENDING',
  admin_notes TEXT NULL,
  reviewed_by VARCHAR(191) NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_sponsor_requests_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_sponsor_requests_team (team_id),
  INDEX idx_cms_sponsor_requests_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Sponsors : dossiers actifs (contrat) une fois une demande acceptée —
-- niveau, taille et emplacement du logo, durée et montant du contrat.
CREATE TABLE cms_sponsors (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  sponsor_request_id BIGINT NULL,
  company_name VARCHAR(200) NOT NULL,
  logo_url VARCHAR(255) NULL,
  logo_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL DEFAULT 'MEDIUM',
  website VARCHAR(255) NULL,
  level ENUM('OR','ARGENT','BRONZE','LOCAL') NOT NULL DEFAULT 'LOCAL',
  logo_placement VARCHAR(255) NULL COMMENT 'Liste de codes séparés par virgule : HOME,FOOTER,MATCH_PAGES,SHOP',
  contract_start DATE NULL,
  contract_end DATE NULL,
  contract_amount DECIMAL(10,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_sponsors_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_sponsors_request FOREIGN KEY (sponsor_request_id) REFERENCES cms_sponsor_requests(id) ON DELETE SET NULL,
  INDEX idx_cms_sponsors_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
