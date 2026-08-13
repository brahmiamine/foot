-- TASK-P0-023 : verrou optimiste sur ms_sheets — deux officiels agissant sur
-- la même feuille en même temps (ex. les deux clôturent/rouvrent) ne
-- doivent plus s'écraser silencieusement. SheetService.updateStatus/reopen
-- font désormais un UPDATE conditionnel sur `version` quand un
-- expectedVersion est fourni par l'appelant. Nouvelle colonne, valeur par
-- défaut 1, n'affecte aucune donnée existante.

USE foot;

ALTER TABLE ms_sheets
  ADD COLUMN version INT NOT NULL DEFAULT 1 AFTER closed_at;
