-- Seller governance: applications, club policy and one-time activation invites.
CREATE TABLE IF NOT EXISTS sp_marketplace_club_settings (
  clubId CHAR(36) NOT NULL PRIMARY KEY,
  sellerApplicationsEnabled TINYINT(1) NOT NULL DEFAULT 1,
  sellerApprovalRequired TINYINT(1) NOT NULL DEFAULT 1,
  productApprovalRequired TINYINT(1) NOT NULL DEFAULT 1,
  productReapprovalOnSensitiveChange TINYINT(1) NOT NULL DEFAULT 1,
  updatedBy VARCHAR(191) NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_seller_applications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  clubId CHAR(36) NOT NULL,
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
  documents JSON NULL,
  status ENUM('PENDING','UNDER_REVIEW','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  rejectionReason TEXT NULL,
  reviewedBy VARCHAR(191) NULL,
  reviewedAt DATETIME NULL,
  sellerId CHAR(36) NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY idx_sp_seller_applications_club_status (clubId, status),
  KEY idx_sp_seller_applications_club_email (clubId, email),
  KEY idx_sp_seller_applications_seller (sellerId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_seller_invites (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sellerId CHAR(36) NOT NULL,
  sellerUserId CHAR(36) NOT NULL,
  tokenHash CHAR(64) NOT NULL,
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_sp_seller_invites_token (tokenHash),
  KEY idx_sp_seller_invites_seller (sellerId),
  KEY idx_sp_seller_invites_user (sellerUserId),
  CONSTRAINT fk_sp_seller_invites_seller FOREIGN KEY (sellerId) REFERENCES sp_sellers(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_seller_invites_user FOREIGN KEY (sellerUserId) REFERENCES sp_seller_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
