-- Migration : documents génériques + échéances, cotisations/paiements,
-- commandes boutique, évaluations joueurs, accusés de lecture des
-- notifications — dernière vague du plan de refonte architecturale.
--
--   - `cms_documents`            : document générique (entity_type +
--     entity_id, ex: PLAYER/STAFF/LICENSE/INJURY/GUARDIAN), avec échéance
--     optionnelle (expires_at) exploitable par un tableau de bord
--     d'échéances (licences + documents confondus). Polymorphe par
--     conception : pas de clé étrangère sur entity_id (plusieurs tables
--     cibles possibles), intégrité vérifiée côté application.
--   - `cms_fee_plans`/`cms_player_fees`/`cms_payments` : cotisations du
--     club en TND, assignées aux joueurs, réglées en un ou plusieurs
--     versements. Le statut (`cms_player_fees.status`) est recalculé côté
--     application à partir de la somme des paiements.
--   - `cms_orders`/`cms_order_items` : commandes de la boutique du club
--     (`cms_products`, jusqu'ici catalogue seul, sans commande/paiement —
--     voir commentaire de l'entité Product). Nom/prix produit dupliqués en
--     snapshot sur la ligne de commande pour rester corrects même si le
--     produit est modifié/supprimé ensuite.
--   - `cms_player_evaluations`/`cms_player_objectives` : suivi de la
--     progression des jeunes joueurs (évaluation technique/tactique/
--     physique/mentale + objectifs individuels datés).
--   - `cms_notification_reads` : accusé de lecture par compte pour une
--     notification (`cms_notifications`, diffusion dynamique par
--     catégorie déjà existante, non modifiée) — une ligne = un compte a lu
--     une notification donnée.
--
-- Toutes les tables sont additives, aucune table partagée avec
-- cardManager/ArbiNote/matchsheet/superadmin n'est modifiée.

USE foot;

-- ---------------------------------------------------------------------
-- 1. Documents génériques + échéances
-- ---------------------------------------------------------------------

CREATE TABLE cms_documents (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  entity_type ENUM('PLAYER', 'STAFF', 'LICENSE', 'INJURY', 'GUARDIAN', 'TEAM', 'OTHER') NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  category ENUM('IDENTITY', 'MEDICAL', 'LICENSE', 'INSURANCE', 'PARENTAL_CONSENT', 'CONTRACT', 'OTHER') NOT NULL DEFAULT 'OTHER',
  title VARCHAR(200) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  issued_at DATE NULL,
  expires_at DATE NULL,
  notes VARCHAR(500) NULL,
  uploaded_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_documents_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES User(id) ON DELETE SET NULL,
  INDEX idx_cms_documents_entity (entity_type, entity_id),
  INDEX idx_cms_documents_expires (team_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------
-- 2. Cotisations & paiements (TND)
-- ---------------------------------------------------------------------

CREATE TABLE cms_fee_plans (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  season_id BIGINT NULL,
  name VARCHAR(150) NOT NULL,
  amount DECIMAL(10, 3) NOT NULL,
  category ENUM(
    'seniors',
    'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'u14', 'u13',
    'u12', 'u11', 'u10', 'u9', 'u8', 'u7'
  ) NULL,
  description VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_fee_plans_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_fee_plans_season FOREIGN KEY (season_id) REFERENCES cms_seasons(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_player_fees (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) NOT NULL,
  fee_plan_id BIGINT NULL,
  label VARCHAR(150) NOT NULL,
  amount_due DECIMAL(10, 3) NOT NULL,
  due_date DATE NULL,
  status ENUM('PENDING', 'PARTIAL', 'PAID', 'WAIVED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_player_fees_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_player_fees_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_player_fees_plan FOREIGN KEY (fee_plan_id) REFERENCES cms_fee_plans(id) ON DELETE SET NULL,
  INDEX idx_cms_player_fees_team_status (team_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_payments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  player_fee_id BIGINT NOT NULL,
  amount DECIMAL(10, 3) NOT NULL,
  method ENUM('CASH', 'TRANSFER', 'CHECK', 'OTHER') NOT NULL DEFAULT 'CASH',
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(255) NULL,
  recorded_by VARCHAR(191) NULL,
  CONSTRAINT fk_cms_payments_player_fee FOREIGN KEY (player_fee_id) REFERENCES cms_player_fees(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_payments_recorded_by FOREIGN KEY (recorded_by) REFERENCES User(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------
-- 3. Commandes boutique (cms_products existait déjà en catalogue seul)
-- ---------------------------------------------------------------------

CREATE TABLE cms_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NULL,
  customer_name VARCHAR(150) NULL,
  customer_phone VARCHAR(30) NULL,
  status ENUM('PENDING', 'CONFIRMED', 'READY', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  total_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_orders_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_orders_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE SET NULL,
  INDEX idx_cms_orders_team_status (team_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NULL,
  product_name VARCHAR(200) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 3) NOT NULL,
  CONSTRAINT fk_cms_order_items_order FOREIGN KEY (order_id) REFERENCES cms_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_order_items_product FOREIGN KEY (product_id) REFERENCES cms_products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------
-- 4. Évaluations & objectifs individuels (progression des jeunes)
-- ---------------------------------------------------------------------

CREATE TABLE cms_player_evaluations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) NOT NULL,
  season_id BIGINT NULL,
  evaluator_id VARCHAR(191) NULL,
  evaluation_date DATE NOT NULL,
  technical_score TINYINT NULL,
  tactical_score TINYINT NULL,
  physical_score TINYINT NULL,
  mental_score TINYINT NULL,
  comment VARCHAR(1000) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_player_evaluations_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_player_evaluations_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_player_evaluations_season FOREIGN KEY (season_id) REFERENCES cms_seasons(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_player_evaluations_evaluator FOREIGN KEY (evaluator_id) REFERENCES User(id) ON DELETE SET NULL,
  CONSTRAINT chk_cms_player_evaluations_scores CHECK (
    (technical_score IS NULL OR technical_score BETWEEN 0 AND 20) AND
    (tactical_score IS NULL OR tactical_score BETWEEN 0 AND 20) AND
    (physical_score IS NULL OR physical_score BETWEEN 0 AND 20) AND
    (mental_score IS NULL OR mental_score BETWEEN 0 AND 20)
  ),
  INDEX idx_cms_player_evaluations_player (player_id, evaluation_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_player_objectives (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  player_id VARCHAR(191) NOT NULL,
  evaluation_id BIGINT NULL,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(500) NULL,
  target_date DATE NULL,
  status ENUM('IN_PROGRESS', 'ACHIEVED', 'MISSED') NOT NULL DEFAULT 'IN_PROGRESS',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_player_objectives_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_player_objectives_player FOREIGN KEY (player_id) REFERENCES Player(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_player_objectives_evaluation FOREIGN KEY (evaluation_id) REFERENCES cms_player_evaluations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------
-- 5. Accusés de lecture des notifications
-- ---------------------------------------------------------------------

CREATE TABLE cms_notification_reads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  notification_id BIGINT NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_notification_reads_notification FOREIGN KEY (notification_id) REFERENCES cms_notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_notification_reads_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
  CONSTRAINT uq_cms_notification_reads UNIQUE (notification_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
