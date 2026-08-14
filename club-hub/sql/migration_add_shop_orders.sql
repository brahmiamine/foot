-- Boutique client avec paiement réel (avancement.md, rang 1) : jusqu'ici
-- seule la gestion admin du catalogue existait (cms_products), aucune
-- table de commande. Additive, n'affecte aucune donnée existante.

USE foot;

CREATE TABLE IF NOT EXISTS shop_orders (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- FK logique vers teams.id — le club vendeur, jamais deux clubs dans une
  -- même commande (voir ShopOrderService.createOrder).
  team_id CHAR(36) NOT NULL,
  -- User.id (sso, rôle MEMBER).
  purchaser_id VARCHAR(191) NOT NULL,
  status ENUM('PENDING','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
  total_price DECIMAL(10,3) NOT NULL,
  -- Payment.id de payments couvrant cette commande. NULL tant que
  -- l'appel POST /payments/*/init n'a pas réussi.
  payment_id VARCHAR(36) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  paid_at DATETIME(6) NULL,
  INDEX idx_shop_orders_team_id (team_id),
  INDEX idx_shop_orders_purchaser_id (purchaser_id),
  INDEX idx_shop_orders_payment_id (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shop_order_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  -- FK logique vers cms_products.id.
  product_id BIGINT NOT NULL,
  -- Snapshot au moment de l'achat : le catalogue peut évoluer après coup
  -- (prix modifié, produit renommé) sans changer ce qui a été payé.
  product_name_fr VARCHAR(200) NOT NULL,
  unit_price DECIMAL(10,3) NOT NULL,
  quantity INT NOT NULL,
  line_total DECIMAL(10,3) NOT NULL,
  INDEX idx_shop_order_items_order_id (order_id),
  CONSTRAINT fk_shop_order_items_order FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
