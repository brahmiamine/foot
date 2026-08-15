import type { DataSource, EntityManager } from "typeorm";
import { FootballAgent, RepresentationAgreement } from "@/entities/Agent";
import { getDataSource } from "@/lib/database";
import { isFootballAgentActive } from "../../../packages/regulatory-shared/src/agents";

type RepositorySource = DataSource | EntityManager;

export async function isAgentActive(agentId: string, source?: RepositorySource): Promise<boolean> {
  const dataSource = source ?? await getDataSource();
  const agent = await dataSource.getRepository(FootballAgent).findOne({ where: { id: agentId } });
  if (!agent) return false;
  return isFootballAgentActive(agent.status, agent.validUntil);
}

export async function assertTransferRepresentation(
  source: RepositorySource,
  input: { agentId?: string | null; representationAgreementId?: string | null; playerId: string; fromTeamId: string; toTeamId: string; effectiveDate: string },
): Promise<void> {
  if (!input.agentId && !input.representationAgreementId) return;
  if (!input.agentId || !input.representationAgreementId) throw new Error("L'agent et le mandat de représentation doivent être renseignés ensemble");
  if (!await isAgentActive(input.agentId, source)) throw new Error("L'agent déclaré n'est pas actif dans le registre fédéral");

  const agreement = await source.getRepository(RepresentationAgreement).findOne({ where: { id: input.representationAgreementId, agentId: input.agentId, status: "ACTIVE" } });
  if (!agreement) throw new Error("Le mandat de représentation déclaré n'est pas actif pour cet agent");
  const effective = new Date(input.effectiveDate);
  if (new Date(agreement.startDate) > effective || new Date(agreement.endDate) < effective) throw new Error("Le mandat de représentation n'est pas valable à la date du transfert");
  const coversPlayer = agreement.playerId === input.playerId;
  const coversClub = agreement.clubId === input.fromTeamId || agreement.clubId === input.toTeamId;
  if (!coversPlayer && !coversClub) throw new Error("Le mandat de représentation ne concerne ni le joueur ni les clubs de ce transfert");
}
