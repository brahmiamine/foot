-- TASK-P0-004 (todo.md) : tunnel de commande marketplace multi-vendeur
-- (panier, checkout, paiement). Additive, n'affecte aucune donnée
-- existante (sp_market_orders/sp_seller_order_items étaient vides,
-- scaffolding jamais utilisé jusqu'ici — voir marketplace/src/orders).

ALTER TABLE sp_market_orders
  ADD COLUMN memberId VARCHAR(191) NULL AFTER orderNumber,
  ADD COLUMN idempotencyKey VARCHAR(255) NULL AFTER memberId,
  ADD COLUMN status ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING' AFTER totalAmount,
  ADD COLUMN paymentId VARCHAR(36) NULL AFTER status,
  ADD UNIQUE KEY uq_sp_market_orders_member_idempotency (memberId, idempotencyKey),
  ADD INDEX idx_sp_market_orders_payment (paymentId);

ALTER TABLE sp_seller_order_items
  ADD COLUMN reservationId VARCHAR(191) NULL AFTER totalPrice;

CREATE TABLE IF NOT EXISTS sp_carts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  memberId VARCHAR(191) NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sp_carts_member (memberId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_cart_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  cartId CHAR(36) NOT NULL,
  productId CHAR(36) NOT NULL,
  variantId CHAR(36) NULL,
  quantity INT NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sp_cart_items_cart_product_variant (cartId, productId, variantId),
  CONSTRAINT fk_sp_cart_items_cart FOREIGN KEY (cartId) REFERENCES sp_carts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
