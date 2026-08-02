CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` char(36) NOT NULL,
    `action` varchar(50) NOT NULL,
    `entity_type` varchar(50) NOT NULL,
    `entity_id` char(36) DEFAULT NULL,
    `summary` text DEFAULT NULL,
    `admin_username` varchar(100) DEFAULT NULL,
    `ip_address` varchar(45) DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_audit_logs_created` (`created_at`),
    KEY `idx_audit_logs_entity` (`entity_type`, `entity_id`),
    KEY `idx_audit_logs_admin` (`admin_username`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;
