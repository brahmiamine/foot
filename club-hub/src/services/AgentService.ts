import { FootballAgent } from "@/entities/Agent";
import { getDataSource } from "@/lib/database";
import { isFootballAgentActive } from "../../../packages/regulatory-shared/src/agents";

/** Lecture seule : la fédération est seule source de vérité (voir federation-hub/src/lib/agents.ts). Utilisée comme garde serveur lors de la liaison d'un agent à un contrat joueur (P0-004/P1-006). */
export async function isAgentActive(agentId: string): Promise<boolean> {
  const dataSource = await getDataSource();
  const agent = await dataSource.getRepository(FootballAgent).findOne({ where: { id: agentId } });
  if (!agent) return false;
  return isFootballAgentActive(agent.status, agent.validUntil);
}
