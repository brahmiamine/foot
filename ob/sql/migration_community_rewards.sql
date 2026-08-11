-- Phase 5 : programme de fidélité "OB Fan Rewards" (#28). Le moteur de
-- points existe depuis la phase 1 (ob_points_ledger) ; ce qui manquait
-- pour coller au barème de la spec, c'est les quiz (+20) et le check-in
-- stade (+200) — ce dernier permet aussi d'attribuer enfin le badge
-- "10 présences au stade" (jusqu'ici manuel, voir badges.ts phase 1).

USE foot;

CREATE TABLE ob_quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  created_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ob_quiz_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  label VARCHAR(191) NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_ob_quiz_options_quiz FOREIGN KEY (quiz_id) REFERENCES ob_quizzes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ob_quiz_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  option_id INT NOT NULL,
  user_id VARCHAR(191) NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ob_quiz_answer (quiz_id, user_id),
  CONSTRAINT fk_ob_quiz_answers_quiz FOREIGN KEY (quiz_id) REFERENCES ob_quizzes (id) ON DELETE CASCADE,
  CONSTRAINT fk_ob_quiz_answers_option FOREIGN KEY (option_id) REFERENCES ob_quiz_options (id) ON DELETE CASCADE,
  CONSTRAINT fk_ob_quiz_answers_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Auto-déclaré par le supporter (pas de QR/géoloc — la billetterie qui
-- permettrait une vérification réelle est encore en attente, cf phase 4),
-- limité aux matchs à domicile de l'OB en cours (status IN_PROGRESS).
CREATE TABLE ob_stadium_checkins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  match_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ob_checkin (user_id, match_id),
  CONSTRAINT fk_ob_stadium_checkins_user FOREIGN KEY (user_id) REFERENCES ob_members (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
