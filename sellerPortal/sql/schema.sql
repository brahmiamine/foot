-- sellerPortal — schéma initial
-- Base MariaDB partagée "foot" (voir ../../start.sh). Tables préfixées
-- `sp_` (Seller Portal) pour rester isolées des autres apps du monorepo.
-- Les UUID sont générés côté application (TypeORM `PrimaryGeneratedColumn("uuid")`),
-- pas par la base.

CREATE TABLE IF NOT EXISTS sp_sellers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  businessName VARCHAR(191) NOT NULL,
  ownerName VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL,
  phone VARCHAR(32) NULL,
  address VARCHAR(255) NULL,
  city VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  description TEXT NULL,
  activityCategory VARCHAR(120) NULL,
  taxId VARCHAR(120) NULL,
  tradeRegister VARCHAR(120) NULL,
  logoUrl VARCHAR(500) NULL,
  documents JSON NULL,
  status ENUM('PENDING','ACTIVE','SUSPENDED','REJECTED','CLOSED') NOT NULL DEFAULT 'PENDING',
  statusReason TEXT NULL,
  commissionRate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sp_sellers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_seller_users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sellerId CHAR(36) NOT NULL,
  name VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  role ENUM('OWNER','MANAGER','STAFF') NOT NULL DEFAULT 'OWNER',
  status ENUM('ACTIVE','INVITED','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  emailVerifiedAt DATETIME NULL,
  passwordResetTokenHash VARCHAR(191) NULL,
  passwordResetExpiresAt DATETIME NULL,
  lastLoginAt DATETIME NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sp_seller_users_email (email),
  CONSTRAINT fk_sp_seller_users_seller FOREIGN KEY (sellerId) REFERENCES sp_sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_product_categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  parentId CHAR(36) NULL,
  commissionRate DECIMAL(5,2) NULL,
  UNIQUE KEY uq_sp_product_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_products (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sellerId CHAR(36) NOT NULL,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  description TEXT NULL,
  shortDescription VARCHAR(500) NULL,
  categoryId CHAR(36) NULL,
  brand VARCHAR(191) NULL,
  sku VARCHAR(120) NOT NULL,
  price DECIMAL(10,3) NOT NULL,
  compareAtPrice DECIMAL(10,3) NULL,
  taxRate DECIMAL(5,2) NOT NULL DEFAULT 0,
  weightKg DECIMAL(8,3) NULL,
  dimensions VARCHAR(120) NULL,
  status ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','PUBLISHED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  rejectionReason TEXT NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  deletedAt DATETIME NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sp_products_sku (sku),
  KEY idx_sp_products_seller_status (sellerId, status),
  CONSTRAINT fk_sp_products_seller FOREIGN KEY (sellerId) REFERENCES sp_sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_product_images (
  id CHAR(36) NOT NULL PRIMARY KEY,
  productId CHAR(36) NOT NULL,
  url VARCHAR(500) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_sp_product_images_product FOREIGN KEY (productId) REFERENCES sp_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_product_variants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  productId CHAR(36) NOT NULL,
  sku VARCHAR(120) NOT NULL,
  attributes JSON NOT NULL,
  price DECIMAL(10,3) NULL,
  imageUrl VARCHAR(500) NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_sp_product_variants_sku (sku),
  CONSTRAINT fk_sp_product_variants_product FOREIGN KEY (productId) REFERENCES sp_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_inventory_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sellerId CHAR(36) NOT NULL,
  productId CHAR(36) NOT NULL,
  variantId CHAR(36) NULL,
  available INT NOT NULL DEFAULT 0,
  reserved INT NOT NULL DEFAULT 0,
  sold INT NOT NULL DEFAULT 0,
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sp_inventory_items_product_variant (productId, variantId),
  CONSTRAINT fk_sp_inventory_items_product FOREIGN KEY (productId) REFERENCES sp_products(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_inventory_items_variant FOREIGN KEY (variantId) REFERENCES sp_product_variants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Réplique en lecture des commandes globales multi-vendeurs. Dans
-- l'architecture cible, cette table appartient à la Marketplace API.
CREATE TABLE IF NOT EXISTS sp_market_orders (
  id CHAR(36) NOT NULL PRIMARY KEY,
  orderNumber VARCHAR(40) NOT NULL,
  customerName VARCHAR(191) NOT NULL,
  customerEmail VARCHAR(191) NOT NULL,
  customerPhone VARCHAR(32) NULL,
  shippingAddress VARCHAR(500) NULL,
  totalAmount DECIMAL(10,3) NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sp_market_orders_number (orderNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_seller_orders (
  id CHAR(36) NOT NULL PRIMARY KEY,
  orderId CHAR(36) NOT NULL,
  sellerId CHAR(36) NOT NULL,
  status ENUM('PENDING','CONFIRMED','PROCESSING','READY_TO_SHIP','SHIPPED','DELIVERED','CANCELLED','RETURN_REQUESTED','RETURNED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  subtotal DECIMAL(10,3) NOT NULL,
  commissionRate DECIMAL(5,2) NOT NULL,
  commissionAmount DECIMAL(10,3) NOT NULL,
  netAmount DECIMAL(10,3) NOT NULL,
  shippingCarrier VARCHAR(120) NULL,
  trackingNumber VARCHAR(191) NULL,
  shippedAt DATETIME NULL,
  deliveredAt DATETIME NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY idx_sp_seller_orders_seller_status (sellerId, status),
  CONSTRAINT fk_sp_seller_orders_order FOREIGN KEY (orderId) REFERENCES sp_market_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_seller_orders_seller FOREIGN KEY (sellerId) REFERENCES sp_sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_seller_order_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sellerOrderId CHAR(36) NOT NULL,
  productId CHAR(36) NULL,
  variantId CHAR(36) NULL,
  productName VARCHAR(191) NOT NULL,
  sku VARCHAR(120) NOT NULL,
  variantLabel VARCHAR(191) NULL,
  quantity INT NOT NULL,
  unitPrice DECIMAL(10,3) NOT NULL,
  totalPrice DECIMAL(10,3) NOT NULL,
  CONSTRAINT fk_sp_seller_order_items_order FOREIGN KEY (sellerOrderId) REFERENCES sp_seller_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_return_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sellerId CHAR(36) NOT NULL,
  sellerOrderId CHAR(36) NOT NULL,
  sellerOrderItemId CHAR(36) NOT NULL,
  customerName VARCHAR(191) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('REQUESTED','APPROVED','REJECTED','COMPLETED') NOT NULL DEFAULT 'REQUESTED',
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_sp_return_requests_order FOREIGN KEY (sellerOrderId) REFERENCES sp_seller_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_return_requests_item FOREIGN KEY (sellerOrderItemId) REFERENCES sp_seller_order_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_payouts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sellerId CHAR(36) NOT NULL,
  reference VARCHAR(40) NOT NULL,
  amount DECIMAL(10,3) NOT NULL,
  status ENUM('PENDING','PROCESSING','PAID','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  periodStart DATE NOT NULL,
  periodEnd DATE NOT NULL,
  paidAt DATETIME NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sp_payouts_reference (reference),
  CONSTRAINT fk_sp_payouts_seller FOREIGN KEY (sellerId) REFERENCES sp_sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sellerId CHAR(36) NOT NULL,
  type ENUM('PRODUCT_APPROVED','PRODUCT_REJECTED','NEW_ORDER','ORDER_CANCELLED','RETURN_REQUESTED','PAYOUT_PAID','ACCOUNT_SUSPENDED') NOT NULL,
  title VARCHAR(191) NOT NULL,
  message TEXT NOT NULL,
  isRead TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_sp_notifications_seller FOREIGN KEY (sellerId) REFERENCES sp_sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
