-- migration-v2 P1-004 : rattachement opérationnel du staff à un match officiel.
-- Le HEAD_COACH est ensuite contrôlé par StaffEligibilityService avant
-- PRE_MATCH_SIGNED, notamment contre saisons.minimum_head_coach_qualification.
USE foot;

CREATE TABLE IF NOT EXISTS ms_match_staff_assignments (
  id char(36) NOT NULL DEFAULT uuid(),
  match_id char(36) NOT NULL,
  team_id char(36) NOT NULL,
  staff_id bigint NOT NULL,
  role enum('HEAD_COACH','ASSISTANT_COACH','MEDICAL','STAFF') NOT NULL,
  assigned_by varchar(191) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_match_staff_role (match_id, team_id, role),
  UNIQUE KEY uq_match_staff_person_role (match_id, team_id, staff_id, role),
  CONSTRAINT fk_match_staff_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_match_staff_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_match_staff_staff FOREIGN KEY (staff_id) REFERENCES cms_staff(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
