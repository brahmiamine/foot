-- migration-v2 P0-011 : complète l'assistant annuel avec les campagnes
-- réglementaires qui manquaient encore (licences personnes, engagements,
-- conformité financière et fenêtre de transfert principale).
USE foot;

ALTER TABLE season_regulatory_cycles
  ADD COLUMN IF NOT EXISTS person_licensing_open_at datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS person_licensing_close_at datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS competition_entry_open_at datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS competition_entry_close_at datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS financial_compliance_open_at datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS financial_compliance_close_at datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transfer_window_open_at datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transfer_window_close_at datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS season_prepared_at datetime DEFAULT NULL;
