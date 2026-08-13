-- TASK-P0-014 : idempotence de la réouverture de match — un appelant peut
-- rejouer la même requête (retry réseau après timeout côté superadmin) sans
-- déclencher une seconde fois la transition ni ses effets de bord. La clé
-- unique (match_id, idempotency_key) garantit qu'un seul appel avec cette
-- clé exacte pour ce match a réellement exécuté la réouverture.
-- Nouvelle table, n'affecte aucune donnée existante.

USE foot;

CREATE TABLE IF NOT EXISTS ms_match_reopen_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  match_id CHAR(36) NOT NULL,
  idempotency_key VARCHAR(191) NOT NULL,
  sheet_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_match_reopen (match_id, idempotency_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
