-- Domaine privé Federation Hub. Les votes publics restent dans `votes` et ne
-- sont jamais fusionnés avec ces évaluations officielles.
USE foot;

CREATE TABLE IF NOT EXISTS referee_official_evaluations (
  id CHAR(36) NOT NULL DEFAULT uuid() PRIMARY KEY,
  match_id CHAR(36) NOT NULL,
  arbitre_id CHAR(36) NOT NULL,
  observer_user_id VARCHAR(191) NOT NULL,
  evaluator_role VARCHAR(64) NOT NULL DEFAULT 'REFEREE_OBSERVER',
  federation_id CHAR(36) NOT NULL,
  league_id CHAR(36) NOT NULL,
  criteres JSON NOT NULL,
  note_officielle DECIMAL(5, 2) NOT NULL,
  private_comment TEXT NULL,
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
  KEY idx_official_eval_scope (federation_id, league_id),
  KEY idx_official_eval_status (status),
  CONSTRAINT fk_official_eval_match FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
  CONSTRAINT fk_official_eval_arbitre FOREIGN KEY (arbitre_id) REFERENCES arbitres (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Backfill non destructif lorsque l'ancienne table créée par ArbiNote existe.
ALTER TABLE referee_official_evaluations
  ADD COLUMN IF NOT EXISTS evaluator_role VARCHAR(64) NOT NULL DEFAULT 'REFEREE_OBSERVER' AFTER observer_user_id,
  ADD COLUMN IF NOT EXISTS federation_id CHAR(36) NULL AFTER evaluator_role,
  ADD COLUMN IF NOT EXISTS league_id CHAR(36) NULL AFTER federation_id,
  ADD COLUMN IF NOT EXISTS private_comment TEXT NULL AFTER note_officielle;

UPDATE referee_official_evaluations evaluation
JOIN matches m ON m.id = evaluation.match_id
JOIN journees j ON j.id = m.journee_id
JOIN saisons s ON s.id = j.saison_id
JOIN leagues l ON l.id = s.league_id
SET evaluation.federation_id = l.federation_id,
    evaluation.league_id = l.id
WHERE evaluation.federation_id IS NULL OR evaluation.league_id IS NULL;

-- Une ligne historique sans scope doit bloquer explicitement la migration :
-- une évaluation officielle ne peut jamais exister hors périmètre.
ALTER TABLE referee_official_evaluations
  MODIFY COLUMN federation_id CHAR(36) NOT NULL,
  MODIFY COLUMN league_id CHAR(36) NOT NULL,
  ADD INDEX IF NOT EXISTS idx_official_eval_scope (federation_id, league_id);

CREATE TABLE IF NOT EXISTS official_referee_criteria (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  label_fr VARCHAR(191) NOT NULL,
  label_en VARCHAR(191) NULL,
  label_ar VARCHAR(191) NULL,
  weight DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO official_referee_criteria (id, label_fr, label_en, label_ar, display_order)
VALUES
  ('decision_accuracy', 'Exactitude des décisions', 'Decision accuracy', 'دقة القرارات', 10),
  ('match_control', 'Maîtrise du match', 'Match control', 'إدارة المباراة', 20),
  ('positioning', 'Placement et déplacements', 'Positioning and movement', 'التمركز والتحرك', 30),
  ('communication', 'Communication', 'Communication', 'التواصل', 40),
  ('discipline', 'Gestion disciplinaire', 'Disciplinary management', 'إدارة العقوبات', 50)
ON DUPLICATE KEY UPDATE id = VALUES(id);
