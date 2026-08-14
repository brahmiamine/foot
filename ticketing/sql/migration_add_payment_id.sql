-- Intégration payments (avancement.md, rang 9) : corrèle un billet au
-- paiement payments qui le couvre. Additive, nullable — les billets déjà
-- PAID (V1 mock) n'ont pas de payment_id et le resteront, ce qui est
-- correct : ils ont été confirmés hors de tout paiement réel.

USE foot;

ALTER TABLE tk_tickets
  ADD COLUMN IF NOT EXISTS payment_id VARCHAR(36) NULL AFTER used_at,
  ADD INDEX IF NOT EXISTS idx_tk_tickets_payment_id (payment_id);
