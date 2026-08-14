-- TASK-P0-009 : révocation ciblée d'un billet, distincte du cycle de vie
-- normal (`status`). Un billet PAID peut être révoqué (fraude détectée,
-- litige, remboursement hors flux...) sans que ça se confonde avec
-- CANCELLED (annulation avant paiement) ni USED (déjà scanné). scanTicket()
-- vérifie `revoked` en plus de `status` et rejette tout scan avec un motif
-- dédié ("REVOKED"). Additive, nullable/par défaut — n'affecte aucun billet
-- existant.

USE foot;

ALTER TABLE tk_tickets
  ADD COLUMN IF NOT EXISTS revoked TINYINT(1) NOT NULL DEFAULT 0 AFTER audience_mismatch,
  ADD COLUMN IF NOT EXISTS revoked_at DATETIME NULL AFTER revoked,
  ADD COLUMN IF NOT EXISTS revoked_reason VARCHAR(255) NULL AFTER revoked_at,
  ADD COLUMN IF NOT EXISTS revoked_by VARCHAR(191) NULL AFTER revoked_reason;

-- Nouvel outcome de scan pour un billet révoqué (voir src/lib/tickets.ts,
-- scanTicket) — distinct de NOT_PAID pour que le staff au portique voie un
-- motif explicite plutôt qu'un statut de paiement trompeur.
ALTER TABLE tk_ticket_scans
  MODIFY COLUMN result ENUM('SUCCESS','ALREADY_USED','NOT_PAID','MATCH_CANCELLED','INVALID','REVOKED') NOT NULL;
