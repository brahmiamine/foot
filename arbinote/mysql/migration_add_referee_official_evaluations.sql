-- migration.md §12 (Phase 5) : évaluation fédérale OFFICIELLE d'un arbitre,
-- strictement séparée de la notation publique (`votes`, existante,
-- inchangée par cette migration). Nouvelle table, propre à arbinote,
-- n'affecte aucune donnée existante.

USE foot;

CREATE TABLE IF NOT EXISTS referee_official_evaluations (
  id CHAR(36) NOT NULL DEFAULT uuid() PRIMARY KEY,
  match_id CHAR(36) NOT NULL,
  arbitre_id CHAR(36) NOT NULL,
  observer_user_id VARCHAR(191) NOT NULL,
  criteres JSON NOT NULL,
  note_officielle DECIMAL(5, 2) NOT NULL,
  points_forts TEXT NULL,
  points_faibles TEXT NULL,
  recommandations TEXT NULL,
  status ENUM('DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
  submitted_at DATETIME NULL,
  validated_by VARCHAR(191) NULL,
  validated_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_official_eval_match_arbitre_observer (match_id, arbitre_id, observer_user_id),
  KEY idx_official_eval_arbitre (arbitre_id),
  KEY idx_official_eval_match (match_id),
  KEY idx_official_eval_status (status),
  CONSTRAINT fk_official_eval_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
  CONSTRAINT fk_official_eval_arbitre FOREIGN KEY (arbitre_id) REFERENCES arbitres (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
