-- TASK-P0-003 (todo.md) : annulation en masse des convocations d'un match
-- officiel annulé (federation-hub, cancelMatchAdmin) — soft-cancel, jamais une
-- suppression silencieuse (voir ConvocationService.cancelForMatch).
-- Additive, n'affecte aucune donnée existante.

USE foot;

ALTER TABLE cms_convocations
  ADD COLUMN cancelled_at DATETIME NULL AFTER responded_at,
  ADD COLUMN cancelled_reason VARCHAR(255) NULL AFTER cancelled_at;
