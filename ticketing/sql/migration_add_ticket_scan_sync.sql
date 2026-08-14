-- TASK-P0-008 : synchronisation offline multi-scanner — identifie quel
-- terminal a fait quel scan (voir src/lib/tickets.ts, scanTicket/syncScans)
-- pour pouvoir répondre "billet déjà scanné par le terminal X à telle
-- heure" quand deux appareils synchronisent des scans hors-ligne du même
-- billet. Additive, nullable — n'affecte aucune ligne existante.

USE foot;

ALTER TABLE tk_ticket_scans
  ADD COLUMN IF NOT EXISTS terminal_id VARCHAR(64) NULL AFTER scanned_by;
