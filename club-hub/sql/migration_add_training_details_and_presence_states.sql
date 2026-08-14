-- Migration : détail de séance d'entraînement (objectif, intensité,
-- matériel, blocs d'exercices chronométrés, éventuellement liés à une
-- planche tactique) + 4 états de présence (présent/absent/retard/blessé)
-- au lieu de 3. Additive uniquement, propre à club-hub.

USE foot;

ALTER TABLE cms_trainings
  ADD COLUMN objective VARCHAR(500) NULL AFTER title,
  ADD COLUMN intensity ENUM('LOW', 'MEDIUM', 'HIGH') NULL AFTER training_type,
  ADD COLUMN equipment VARCHAR(500) NULL AFTER duration_minutes;

-- Blocs d'exercices chronométrés composant la séance (ex: Échauffement 15',
-- Technique 20', Jeu réduit 25', Tactique 20', Match 20'). `tactics_board_id`
-- permet d'importer un exercice préparé sur une planche tactique
-- (cms_tactics_boards) directement dans le déroulé de la séance.
CREATE TABLE cms_training_blocks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  training_id BIGINT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  block_type ENUM('WARMUP', 'TECHNIQUE', 'SMALL_SIDED_GAME', 'TACTICS', 'MATCH', 'PHYSICAL', 'RECOVERY', 'OTHER') NOT NULL DEFAULT 'OTHER',
  label VARCHAR(200) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 15,
  notes VARCHAR(500) NULL,
  tactics_board_id BIGINT NULL,
  CONSTRAINT fk_cms_training_blocks_training FOREIGN KEY (training_id) REFERENCES cms_trainings(id) ON DELETE CASCADE,
  CONSTRAINT fk_cms_training_blocks_tactics_board FOREIGN KEY (tactics_board_id) REFERENCES cms_tactics_boards(id) ON DELETE SET NULL,
  INDEX idx_cms_training_blocks_training (training_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- 4 états de présence : on AJOUTE 'LATE'/'INJURED' à l'ENUM existant
-- (PENDING/PRESENT/ABSENT), sans toucher aux valeurs déjà utilisées.
ALTER TABLE cms_training_invitations
  MODIFY COLUMN response ENUM('PENDING', 'PRESENT', 'ABSENT', 'LATE', 'INJURED') NOT NULL DEFAULT 'PENDING';
