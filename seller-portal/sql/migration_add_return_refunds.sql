-- TASK-P0-006 (todo.md) : relie les retours marketplace aux remboursements
-- payments. Additive, n'affecte aucune donnée existante.

ALTER TABLE sp_return_requests
  MODIFY COLUMN status ENUM('REQUESTED','APPROVED','REJECTED','COMPLETED','REFUND_FAILED','REFUNDED') NOT NULL DEFAULT 'REQUESTED',
  ADD COLUMN refundId VARCHAR(36) NULL AFTER status,
  ADD COLUMN refundStatus VARCHAR(20) NULL AFTER refundId,
  ADD COLUMN refundRequestedAt DATETIME(6) NULL AFTER refundStatus,
  ADD COLUMN refundError TEXT NULL AFTER refundRequestedAt;

-- Corrige à cette occasion une dérive préexistante entre l'ENUM MySQL et
-- NotificationType (marketplace/src/notifications/enums/notification-type.enum.ts) :
-- SELLER_ACTIVATED/SELLER_SUSPENDED/LOW_STOCK n'étaient pas acceptés par la
-- colonne (un INSERT avec l'une de ces valeurs échouerait en production,
-- synchronize étant désactivé — voir marketplace/src/config/database.config.ts),
-- ACCOUNT_SUSPENDED restait une valeur morte côté DB. Ajoute aussi
-- RETURN_REFUNDED/RETURN_REFUND_FAILED (TASK-P0-006).
ALTER TABLE sp_notifications
  MODIFY COLUMN type ENUM(
    'PRODUCT_APPROVED','PRODUCT_REJECTED',
    'SELLER_ACTIVATED','SELLER_SUSPENDED',
    'NEW_ORDER','ORDER_CANCELLED',
    'RETURN_REQUESTED','RETURN_REFUNDED','RETURN_REFUND_FAILED',
    'PAYOUT_PAID','LOW_STOCK'
  ) NOT NULL;
