-- Scanner de contrôle d'accès au stade (avancement.md, rang 2) : journal
-- d'entrée pour le scan des billets (voir src/lib/tickets.ts, scanTicket).
-- Une ligne par tentative de scan, réussie ou non — sert à la fois d'audit
-- et de détection de double scan (avec l'état USED déjà présent sur
-- tk_tickets). Nouvelle table, n'affecte aucune donnée existante.

USE foot;

CREATE TABLE IF NOT EXISTS tk_ticket_scans (
  id CHAR(36) NOT NULL PRIMARY KEY,
  -- FK logique vers tk_tickets.id — NULL quand le jeton scanné n'est même
  -- pas une signature valide (jamais résolu à un billet).
  ticket_id CHAR(36) NULL,
  result ENUM('SUCCESS','ALREADY_USED','NOT_PAID','MATCH_CANCELLED','INVALID') NOT NULL,
  -- User.id (sso, rôle ADMIN/SUPERADMIN) du membre du staff qui a scanné.
  scanned_by VARCHAR(191) NOT NULL,
  scanned_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_tk_ticket_scans_ticket_id (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
