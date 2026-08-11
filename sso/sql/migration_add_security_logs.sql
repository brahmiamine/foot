-- Journal de sécurité transverse (avancement.md § 4 « Journal de sécurité
-- transverse »). Table propre à `sso` — aucune autre app n'y écrit ni ne la
-- lit (voir db/OWNERSHIP.md). Distincte de audit_logs (arbinote/superadmin)
-- et AuditLog (teamManager), qui journalisent des actions d'administration
-- métier, pas des événements d'authentification.
--
-- Appliquée automatiquement en dev via start.sh (section « Correctif schéma
-- partagé ») ; ce fichier documente la même migration pour un environnement
-- où start.sh n'est pas utilisé.

USE foot;

CREATE TABLE IF NOT EXISTS security_logs (
  id CHAR(36) NOT NULL DEFAULT uuid() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(191) NULL,
  email VARCHAR(191) NULL,
  ip VARCHAR(45) NULL,
  detail TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_security_logs_event_type (event_type),
  INDEX idx_security_logs_user_id (user_id),
  INDEX idx_security_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
