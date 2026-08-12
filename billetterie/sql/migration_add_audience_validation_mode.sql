-- US-38 (avancement.md) : politique d'audience configurable par catégorie
-- de billet (donc par match, une TicketSaleRule couvrant une
-- MatchTicketCategory précise). DECLARATIVE (défaut, comportement inchangé
-- pour toutes les règles existantes) = auto-déclaration de l'acheteur,
-- signal de modération non bloquant après coup (voir tk_tickets.
-- audience_mismatch). STRICT = vérification bloquante des affiliations sso
-- de l'acheteur avant d'autoriser l'achat (voir US-37, src/lib/tickets.ts).
-- Additive, valeur par défaut — n'affecte aucune règle existante.

USE foot;

ALTER TABLE tk_ticket_sale_rules
  ADD COLUMN IF NOT EXISTS audience_validation_mode ENUM('STRICT','DECLARATIVE') NOT NULL DEFAULT 'DECLARATIVE' AFTER allowed_audience;
