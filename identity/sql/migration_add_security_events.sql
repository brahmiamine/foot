-- Journal de sécurité (avancement.md, § 3.B "Journal de sécurité
-- transverse") : échecs de connexion, rate limit, échecs MFA, demandes/
-- confirmations de réinitialisation de mot de passe. Table propre à `sso`
-- (seul endroit qui vérifie un mot de passe ou un code MFA) — aucune autre
-- app n'y écrit ni ne la lit (voir db/OWNERSHIP.md). Pas de clé étrangère
-- vers `User` : un échec de connexion avec un email inconnu ne correspond
-- à aucun compte, l'événement doit quand même être journalisé (email/ip
-- en valeurs figées, comme audit_logs côté referee-center/federation-hub).

USE foot;

CREATE TABLE IF NOT EXISTS security_events (
  id CHAR(36) NOT NULL DEFAULT uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  email VARCHAR(191) NULL,
  user_id VARCHAR(191) NULL,
  ip VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_security_events_type (type),
  INDEX idx_security_events_created_at (created_at),
  INDEX idx_security_events_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
