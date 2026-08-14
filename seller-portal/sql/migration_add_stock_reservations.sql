-- TASK-P0-005 (todo.md) : réservation atomique du stock marketplace.
-- Une ligne par réservation individuelle (pas seulement les compteurs
-- agrégés sur sp_inventory_items) — nécessaire pour une expiration/
-- confirmation/relâche idempotente par référence d'appelant (voir
-- marketplace/src/inventory/inventory.service.ts). Additive,
-- n'affecte aucune donnée existante.

CREATE TABLE IF NOT EXISTS sp_stock_reservations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  inventoryItemId CHAR(36) NOT NULL,
  -- Opaque pour marketplace : une ligne de commande une fois le tunnel
  -- de commande construit (TASK-P0-004), jamais interprétée ici.
  referenceId VARCHAR(191) NOT NULL,
  quantity INT NOT NULL,
  status ENUM('RESERVED', 'CONFIRMED', 'RELEASED', 'EXPIRED') NOT NULL DEFAULT 'RESERVED',
  expiresAt TIMESTAMP NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sp_stock_reservations_item_reference (inventoryItemId, referenceId),
  KEY idx_sp_stock_reservations_status (status),
  KEY idx_sp_stock_reservations_expires_at (expiresAt),
  CONSTRAINT fk_sp_stock_reservations_item FOREIGN KEY (inventoryItemId) REFERENCES sp_inventory_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
