-- Abonnements de saison ("abonnements"), distincts des billets match par
-- match : un produit réutilisable acheté une fois, dont le QR reste
-- scannable tout au long d'une fenêtre de validité fixée par catégorie
-- (contrairement à un billet, jamais un usage unique — voir
-- tk_subscriptions.last_validated_on, la garde "une validation par jour").
--
-- Même répartition de propriété que tk_ticket_categories/tk_tickets (voir
-- db/OWNERSHIP.md) : tk_subscription_categories est administrée par
-- teamManager (catégories/prix/couleur par club), tk_subscriptions et
-- tk_subscription_scans sont possédées par billetterie (achat, paiement,
-- contrôle d'accès). Pas de capacité/quota ni de règle d'audience : un
-- abonnement n'est pas une place de stade rare comme un billet de match,
-- donc pas d'équivalent tk_match_ticket_categories/tk_ticket_sale_rules ici.

USE foot;

CREATE TABLE IF NOT EXISTS tk_subscription_categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- FK logique vers teams.id — catégories définies par l'administration de
  -- chaque club (ex: Or/Argent/Bronze), jamais un enum fixe partagé.
  club_id CHAR(36) NOT NULL,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,3) NOT NULL,
  -- Design (US demandé) : couleur hex simple pour distinguer visuellement
  -- les catégories sur la carte d'abonnement / l'écran QR du supporter.
  color VARCHAR(7) NULL,
  -- Fenêtre de validité de saison, fixe pour tous les acheteurs de cette
  -- catégorie (ex: 01/09/2026 -> 30/06/2027) — recopiée sur chaque
  -- abonnement à l'achat (tk_subscriptions.valid_from/valid_until) pour ne
  -- jamais changer rétroactivement un abonnement déjà vendu si la
  -- catégorie est modifiée plus tard.
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_tk_subscription_categories_club_slug (club_id, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tk_subscriptions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subscription_category_id CHAR(36) NOT NULL,
  -- Club organisateur (= club_id de la catégorie au moment de l'achat),
  -- dénormalisé comme tk_tickets.organizer_team_id pour éviter une jointure
  -- sur chaque lecture.
  organizer_team_id CHAR(36) NOT NULL,
  -- FK logique vers User.id (sso, rôle MEMBER).
  purchaser_id VARCHAR(191) NOT NULL,
  status ENUM('PENDING','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
  reference VARCHAR(32) NOT NULL,
  price DECIMAL(10,3) NOT NULL,
  -- Recopiés depuis la catégorie au moment de l'achat (snapshot, voir
  -- commentaire ci-dessus sur tk_subscription_categories.valid_from).
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  paid_at DATETIME NULL,
  payment_id VARCHAR(36) NULL,
  -- Garde "une validation par jour" (contrairement à un billet, jamais
  -- épuisé après un seul scan) : scanSubscription() ne fait passer
  -- SUCCESS que si cette date diffère de la date du jour, via une mise à
  -- jour conditionnelle atomique — voir src/lib/subscriptions.ts.
  last_validated_on DATE NULL,
  revoked TINYINT(1) NOT NULL DEFAULT 0,
  revoked_at DATETIME NULL,
  revoked_reason VARCHAR(255) NULL,
  revoked_by VARCHAR(191) NULL,
  UNIQUE KEY uq_tk_subscriptions_reference (reference),
  KEY idx_tk_subscriptions_purchaser (purchaser_id),
  KEY idx_tk_subscriptions_category (subscription_category_id),
  KEY idx_tk_subscriptions_payment_id (payment_id),
  CONSTRAINT fk_tk_subscriptions_category FOREIGN KEY (subscription_category_id) REFERENCES tk_subscription_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tk_subscription_scans (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- FK logique vers tk_subscriptions.id — NULL quand le jeton scanné n'est
  -- même pas une signature valide (jamais résolu à un abonnement).
  subscription_id CHAR(36) NULL,
  result ENUM('SUCCESS','ALREADY_VALIDATED_TODAY','NOT_PAID','NOT_YET_VALID','EXPIRED','REVOKED','INVALID') NOT NULL,
  -- User.id (sso, rôle ADMIN/SUPERADMIN) du membre du staff qui a scanné.
  scanned_by VARCHAR(191) NOT NULL,
  terminal_id VARCHAR(64) NULL,
  scanned_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_tk_subscription_scans_subscription_id (subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
