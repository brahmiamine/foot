-- migration-v2 §25 : permissions réglementaires fines, complémentaires aux
-- rôles et scopes federation_id/league_id. Dès qu'un utilisateur possède au
-- moins une ligne, il passe en mode liste blanche pour le domaine réglementaire.
USE foot;

CREATE TABLE IF NOT EXISTS regulatory_user_permissions (
  id bigint NOT NULL AUTO_INCREMENT,
  user_id varchar(191) NOT NULL,
  permission varchar(100) NOT NULL,
  granted_by varchar(191) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_regulatory_user_permission (user_id, permission),
  KEY idx_regulatory_permission_user (user_id),
  CONSTRAINT fk_regulatory_permission_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
  CONSTRAINT fk_regulatory_permission_granter FOREIGN KEY (granted_by) REFERENCES User(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
