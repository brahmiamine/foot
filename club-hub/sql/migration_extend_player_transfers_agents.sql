-- migration-v2 P1-006 : intégration réelle des agents/intermédiaires dans
-- le workflow de transfert. Les références pointent vers le registre fédéral
-- et sont revalidées côté serveur lors de la création et de l'homologation.
USE foot;

ALTER TABLE player_transfers
  ADD COLUMN IF NOT EXISTS agent_id char(36) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS representation_agreement_id char(36) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS intermediary_declaration text DEFAULT NULL;

ALTER TABLE player_transfers
  ADD KEY idx_player_transfers_agent (agent_id),
  ADD KEY idx_player_transfers_agreement (representation_agreement_id),
  ADD CONSTRAINT fk_player_transfers_agent FOREIGN KEY (agent_id) REFERENCES football_agents(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_player_transfers_agreement FOREIGN KEY (representation_agreement_id) REFERENCES representation_agreements(id) ON DELETE RESTRICT;
