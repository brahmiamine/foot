-- TASK-P0-003 (todo.md) : journal de la saga d'annulation/report d'un
-- match — un dossier par déclenchement (match_saga_cases), ses étapes
-- détaillées en append-only (match_saga_steps). Nouvelles tables,
-- n'affectent aucune donnée existante.

CREATE TABLE IF NOT EXISTS `match_saga_cases` (
    `id` char(36) NOT NULL,
    `match_id` char(36) NOT NULL,
    `saga_type` enum('CANCEL','RESCHEDULE') NOT NULL,
    `event_version` int NOT NULL DEFAULT 1,
    `reason` text NOT NULL,
    `new_date` datetime DEFAULT NULL,
    `ticket_policy` enum('VALID_FOR_NEW_DATE','REFUND') DEFAULT NULL,
    `status` enum('IN_PROGRESS','COMPLETED','MANUAL_REVIEW') NOT NULL DEFAULT 'IN_PROGRESS',
    `initiated_by` varchar(100) DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_match_saga_cases_match` (`match_id`),
    KEY `idx_match_saga_cases_status` (`status`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `match_saga_steps` (
    `id` char(36) NOT NULL,
    `saga_id` char(36) NOT NULL,
    `step` enum('BILLETTERIE_TICKETS','TEAMMANAGER_CONVOCATIONS') NOT NULL,
    `status` enum('SUCCEEDED','FAILED') NOT NULL,
    `attempt` int NOT NULL,
    `error` text DEFAULT NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_match_saga_steps_saga` (`saga_id`),
    CONSTRAINT `fk_match_saga_steps_case` FOREIGN KEY (`saga_id`) REFERENCES `match_saga_cases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_uca1400_ai_ci;
