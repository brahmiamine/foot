-- Traçabilité de l'audience déclarée à l'achat (avancement.md, "Billetterie
-- — audience réservée fiable") : `audienceConfirmed` était vérifié à
-- l'achat puis jeté, sans laisser de trace de ce qui avait été déclaré.
-- Additive, nullable/par défaut — n'affecte aucun billet existant.
--
-- `declared_audience` fige la règle qui s'appliquait au moment de l'achat
-- (PUBLIC si aucune restriction). `audience_mismatch` est un signal de
-- modération, jamais un blocage : vrai si l'acheteur a déclaré
-- HOME_SUPPORTERS/AWAY_SUPPORTERS mais que ses affiliations sso
-- (member_team_affiliations, purement déclaratives) ne couvrent pas
-- l'équipe correspondante. Ce n'est pas une vérification d'identité — voir
-- billetterie/README.md.

USE foot;

ALTER TABLE tk_tickets
  ADD COLUMN IF NOT EXISTS declared_audience ENUM('PUBLIC','HOME_SUPPORTERS','AWAY_SUPPORTERS') NOT NULL DEFAULT 'PUBLIC' AFTER payment_id,
  ADD COLUMN IF NOT EXISTS audience_mismatch TINYINT(1) NOT NULL DEFAULT 0 AFTER declared_audience;
