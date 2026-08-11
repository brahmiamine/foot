-- Checkout/paiement réel de la boutique club (avancement.md § 4, ligne
-- « Boutique club — checkout/paiement ») : commandes des supporters,
-- réservées en PENDING puis confirmées via payment-api (voir
-- src/services/OrderService.ts). Même conventions que
-- billetterie/sql/schema.sql (table tk_tickets) pour purchaser_id/payment_id
-- (pas de contrainte FK réelle vers User.id : base partagée mais cross-app).
--
-- Préfixe `shop_` (pas `cms_`) : voir db/OWNERSHIP.md § « Boutique / sponsors
-- (legacy teamManager) », qui anticipait déjà ce préfixe dédié aux commandes,
-- distinct de cms_products/cms_product_categories (catalogue).

USE foot;

CREATE TABLE IF NOT EXISTS shop_orders (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- Club vendeur (= cms_products.team_id au moment de l'achat).
  team_id CHAR(36) NOT NULL,
  product_id BIGINT NOT NULL,
  -- FK logique vers User.id (sso, rôle MEMBER) — pas de contrainte FK réelle
  -- cross-connexion (base partagée, mais TypeORM ne la déclare pas ici).
  buyer_id VARCHAR(191) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,3) NOT NULL,
  total_amount DECIMAL(10,3) NOT NULL,
  status ENUM('PENDING','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
  reference VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  payment_id VARCHAR(36) NULL,
  UNIQUE KEY uq_shop_orders_reference (reference),
  KEY idx_shop_orders_buyer (buyer_id),
  KEY idx_shop_orders_product (product_id),
  KEY idx_shop_orders_payment_id (payment_id),
  CONSTRAINT fk_shop_orders_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_shop_orders_product FOREIGN KEY (product_id) REFERENCES cms_products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
