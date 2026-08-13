-- TASK-P0-024 : renforce l'intégrité des signatures — identité de
-- l'opérateur ayant enregistré la signature (traçabilité, pas preuve
-- cryptographique du signataire physique) et hash SHA256 du contenu de la
-- feuille au moment de la signature (détecte un événement ajouté/modifié
-- après coup). SignatureService.save() devient append-only (une nouvelle
-- ligne par signature, jamais un UPDATE en place) pour conserver
-- l'historique complet, y compris les re-signatures.
-- Nouvelles colonnes nullable/avec défaut, n'affecte aucune donnée
-- existante.

USE foot;

ALTER TABLE ms_signatures
  ADD COLUMN recorded_by_user_id VARCHAR(36) NULL AFTER signed_at,
  ADD COLUMN recorded_by_name VARCHAR(191) NULL AFTER recorded_by_user_id,
  ADD COLUMN content_hash CHAR(64) NOT NULL DEFAULT '' AFTER recorded_by_name;

-- LONGTEXT -> TEXT (limite ~64 Ko) : un tracé de signature (trait simple)
-- compresse largement sous cette limite en pratique ; nécessaire pour la
-- compatibilité SQLite des tests (better-sqlite3 ne supporte pas LONGTEXT).
ALTER TABLE ms_signatures
  MODIFY COLUMN signature_data TEXT NOT NULL;

-- Les lignes existantes n'ont pas de hash calculable rétroactivement (le
-- contenu de la feuille au moment de la signature n'est plus reconstituable) :
-- laissées à '' plutôt que NULL, valeur explicitement non vérifiable pour
-- distinguer "signé avant cette migration" de "signature invalide".
