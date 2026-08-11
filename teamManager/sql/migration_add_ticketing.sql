-- Billetterie (V1 sans paiement — voir spec). Nouveau groupe de tables
-- `cms_ticket_*`/`cms_ticketing_*`, scopées par team_id comme le reste de
-- teamManager. Catégories dynamiques (pas de "Gradin"/"Chaise" en dur) :
-- cms_ticket_categories est un catalogue réutilisable par club, et
-- cms_ticketing_event_categories fixe le quota par (billetterie, catégorie).
--
-- IDs en INT (pas BIGINT) : TypeORM/mysql2 renvoie les PK BIGINT comme des
-- chaînes JS à l'exécution (déjà rencontré et corrigé côté `ob`), ce qui
-- casse silencieusement toute comparaison/Map côté JS. INT suffit largement
-- au volume d'une billetterie de club.
--
-- Les commandes/billets/réservations (cms_ticket_orders/order_items/
-- tickets/holds) sont créés par le site public `ob` (c'est là que l'achat a
-- lieu) mais lus/gérés ici (annulation, scan, historique) — seul module de
-- ce schéma où `ob` écrit dans des tables `cms_*` normalement possédées par
-- teamManager. Voir ob/src/entities/ticketing/*.ts pour le miroir.

USE foot;

-- Catalogue réutilisable de catégories (Gradin, Chaise, VIP, Abonnement...).
CREATE TABLE cms_ticket_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NULL,
  description VARCHAR(500) NULL,
  price DECIMAL(10,3) NOT NULL DEFAULT 0,
  color VARCHAR(7) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_ticket_categories_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  INDEX idx_cms_ticket_categories_team (team_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Une billetterie référence un match officiel OU amical, jamais les deux
-- (même convention que cms_trips).
CREATE TABLE cms_ticketing_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  match_type ENUM('OFFICIAL', 'FRIENDLY') NOT NULL,
  match_id CHAR(36) NULL,
  friendly_match_id BIGINT NULL,
  status ENUM('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  sales_start_at DATETIME NULL,
  sales_end_at DATETIME NULL,
  max_tickets_per_order INT NOT NULL DEFAULT 5,
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_ticketing_events_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_ticketing_events_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL,
  CONSTRAINT fk_cms_ticketing_events_friendly_match FOREIGN KEY (friendly_match_id) REFERENCES cms_friendly_matches(id) ON DELETE SET NULL,
  UNIQUE KEY uniq_cms_ticketing_events_match (match_id),
  UNIQUE KEY uniq_cms_ticketing_events_friendly_match (friendly_match_id),
  INDEX idx_cms_ticketing_events_team_status (team_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Quota par (billetterie, catégorie) : la même catégorie peut avoir un
-- quota différent d'un match à l'autre.
CREATE TABLE cms_ticketing_event_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticketing_event_id INT NOT NULL,
  ticket_category_id INT NOT NULL,
  quota INT NOT NULL,
  sold_count INT NOT NULL DEFAULT 0,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_cms_teg_event FOREIGN KEY (ticketing_event_id) REFERENCES cms_ticketing_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_teg_category FOREIGN KEY (ticket_category_id) REFERENCES cms_ticket_categories(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_cms_teg (ticketing_event_id, ticket_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- user_id référence `User.id` côté sso (rôle MEMBER) — écrite par `ob`.
CREATE TABLE cms_ticket_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  ticketing_event_id INT NOT NULL,
  order_number VARCHAR(32) NOT NULL,
  user_id VARCHAR(191) NULL,
  customer_first_name VARCHAR(100) NOT NULL,
  customer_last_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(30) NULL,
  status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_ticket_orders_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_ticket_orders_event FOREIGN KEY (ticketing_event_id) REFERENCES cms_ticketing_events(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_cms_ticket_orders_number (order_number),
  INDEX idx_cms_ticket_orders_email (customer_email),
  INDEX idx_cms_ticket_orders_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE cms_ticket_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  ticket_category_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,3) NOT NULL,
  CONSTRAINT fk_cms_toi_order FOREIGN KEY (order_id) REFERENCES cms_ticket_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_toi_category FOREIGN KEY (ticket_category_id) REFERENCES cms_ticket_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- token_hash = sha256(token) hex, utilisé pour la résolution rapide au scan
-- (recherche par égalité). token_encrypted = le même token chiffré
-- (AES-256-GCM, clé serveur TICKET_TOKEN_SECRET, voir ob/src/lib/ticketToken.ts) :
-- jamais stocké en clair, mais déchiffrable côté serveur pour ré-afficher le
-- QR/PDF depuis "Mes billets" sans avoir à faire re-générer un nouveau code
-- à chaque visite (ce qui invaliderait un billet déjà téléchargé/imprimé).
-- Une fuite de la seule base ne suffit donc pas à reconstituer un token.
CREATE TABLE cms_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  ticketing_event_id INT NOT NULL,
  order_id INT NOT NULL,
  order_item_id INT NOT NULL,
  ticket_category_id INT NOT NULL,
  ticket_number VARCHAR(32) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  token_encrypted VARCHAR(255) NOT NULL,
  holder_first_name VARCHAR(100) NULL,
  holder_last_name VARCHAR(100) NULL,
  status ENUM('HELD', 'ISSUED', 'USED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'HELD',
  issued_at DATETIME NULL,
  used_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_tickets_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_tickets_event FOREIGN KEY (ticketing_event_id) REFERENCES cms_ticketing_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_tickets_order FOREIGN KEY (order_id) REFERENCES cms_ticket_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_tickets_order_item FOREIGN KEY (order_item_id) REFERENCES cms_ticket_order_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_tickets_category FOREIGN KEY (ticket_category_id) REFERENCES cms_ticket_categories(id) ON DELETE RESTRICT,
  UNIQUE KEY uniq_cms_tickets_number (ticket_number),
  UNIQUE KEY uniq_cms_tickets_token (token_hash),
  INDEX idx_cms_tickets_event_status (ticketing_event_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Trace de la réservation temporaire (dé-doublonne le sweep d'expiration
-- de celui des tickets individuels HELD, et sert d'historique).
CREATE TABLE cms_ticket_holds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  ticketing_event_id INT NOT NULL,
  order_id INT NOT NULL,
  ticket_category_id INT NOT NULL,
  quantity INT NOT NULL,
  expires_at DATETIME NOT NULL,
  released_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_ticket_holds_event FOREIGN KEY (ticketing_event_id) REFERENCES cms_ticketing_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_ticket_holds_order FOREIGN KEY (order_id) REFERENCES cms_ticket_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_ticket_holds_category FOREIGN KEY (ticket_category_id) REFERENCES cms_ticket_categories(id) ON DELETE CASCADE,
  INDEX idx_cms_ticket_holds_expiry (expires_at, released_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- controller_user_id référence `User.id` (compte staff, teamManager/sso).
CREATE TABLE cms_ticket_scans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  ticket_id INT NOT NULL,
  controller_user_id VARCHAR(191) NOT NULL,
  gate VARCHAR(50) NULL,
  result ENUM('VALID', 'ALREADY_USED', 'CANCELLED', 'INVALID', 'WRONG_EVENT', 'EXPIRED') NOT NULL,
  device_id VARCHAR(100) NULL,
  scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_ticket_scans_ticket FOREIGN KEY (ticket_id) REFERENCES cms_tickets(id) ON DELETE CASCADE,
  INDEX idx_cms_ticket_scans_ticket (ticket_id),
  INDEX idx_cms_ticket_scans_team_gate (team_id, gate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Un contrôleur = un compte OBSERVATEUR existant (rôle "ticketing.scan"
-- via cms_roles) + une porte par défaut informative.
CREATE TABLE cms_ticket_controllers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  gate VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cms_ticket_controllers_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_cms_ticket_controllers_user (team_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
