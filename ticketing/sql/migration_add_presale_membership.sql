-- OB-003 — prévente réservée aux membres, règle serveur (jamais un simple
-- claim client). Dépend de migration_add_sale_governance.sql (colonne
-- ajoutée à la même table tk_ticket_sale_rules).

ALTER TABLE tk_ticket_sale_rules
  ADD COLUMN presale_requires_membership TINYINT NOT NULL DEFAULT 0 AFTER max_tickets_per_user,
  ADD COLUMN presale_membership_codes JSON NULL AFTER presale_requires_membership,
  ADD COLUMN presale_ends_at DATETIME NULL AFTER presale_membership_codes;
