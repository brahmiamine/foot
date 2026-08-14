import type { DataSource, EntityManager } from "typeorm";
import { PlayerContract, PlayerContractDocument, PlayerContractHistory } from "@/entities/PlayerContract";
import { Player } from "@/entities/Player";
import { PlayerRegistration, PlayerRegistrationHistory } from "@/entities/PlayerRegistration";
import { TeamAffiliation } from "@/entities/TeamAffiliation";
import { getDataSource } from "@/lib/database";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import { isAgentActive } from "@/services/AgentService";
import { assertPlayerContractDates, assertPlayerContractFederalTransition, assertPlayerContractSubmittable, assertPlayerContractTransition, canEditPlayerContract, isPlayerContractHomologated, PlayerContractWorkflowError, type PlayerContractType } from "../../../packages/regulatory-shared/src/playerContract";

export interface PlayerContractActor { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null; }
export interface PlayerContractInput { playerId: string; seasonId: string; contractType: PlayerContractType; startDate: string; endDate: string; salary?: string | null; currency?: string | null; bonusesJson?: Record<string, unknown> | null; agentId?: string | null; }
export interface PlayerContractDocumentInput { fileUrl: string; fileName: string; mimeType: string; size: number; checksum: string; }

async function history(manager: EntityManager, contractId: string, actor: PlayerContractActor, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; beforeValue?: Record<string, unknown> | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(PlayerContractHistory);
  await repo.save(repo.create({ contractId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: actor.userId, actorRole: actor.role, reason: input.reason ?? null, beforeValue: input.beforeValue ?? null, afterValue: input.afterValue ?? null, ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent ?? null }));
}

async function owned(manager: EntityManager, clubId: string, contractId: string, lock = false): Promise<PlayerContract> {
  let query = manager.getRepository(PlayerContract).createQueryBuilder("contract").where("contract.id = :contractId", { contractId }).andWhere("contract.club_id = :clubId", { clubId });
  if (lock) query = query.setLock("pessimistic_write");
  const contract = await query.getOne();
  if (!contract) throw new PlayerContractWorkflowError("Contrat joueur introuvable");
  return contract;
}

async function resolveScope(manager: EntityManager, clubId: string, seasonId: string): Promise<{ federationId: string; leagueId: string | null }> {
  const rows = await manager.query("SELECT id, league_id AS leagueId FROM saisons WHERE id = ? LIMIT 1", [seasonId]) as Array<{ id: string; leagueId: string | null }>;
  if (!rows[0]) throw new PlayerContractWorkflowError("Compétition-saison introuvable");
  const affiliation = await manager.getRepository(TeamAffiliation).createQueryBuilder("affiliation").where("affiliation.team_id = :clubId", { clubId }).andWhere("affiliation.status = 'ACTIVE'").andWhere("(affiliation.saison_id = :seasonId OR affiliation.saison_id IS NULL)", { seasonId }).orderBy("CASE WHEN affiliation.saison_id = :seasonId THEN 0 ELSE 1 END", "ASC").getOne();
  if (!affiliation) throw new PlayerContractWorkflowError("Aucune affiliation réglementaire active pour ce club");
  if (rows[0].leagueId && affiliation.leagueId && rows[0].leagueId !== affiliation.leagueId) throw new PlayerContractWorkflowError("La saison ne relève pas de la ligue d'affiliation du club");
  return { federationId: affiliation.federationId, leagueId: rows[0].leagueId ?? affiliation.leagueId ?? null };
}

function normalizeInput(input: PlayerContractInput): PlayerContractInput {
  assertPlayerContractDates(input.startDate, input.endDate);
  const currency = input.currency?.trim().toUpperCase() || null;
  if (currency && !/^[A-Z]{3}$/.test(currency)) throw new PlayerContractWorkflowError("La devise doit utiliser un code ISO à 3 lettres");
  if (input.salary != null && input.salary !== "" && (!/^\d+(\.\d{1,3})?$/.test(input.salary) || Number(input.salary) < 0)) throw new PlayerContractWorkflowError("Le salaire doit être un montant positif avec au plus 3 décimales");
  return { ...input, currency, salary: input.salary || null, agentId: input.agentId?.trim() || null, bonusesJson: input.bonusesJson ?? null };
}

export async function listPlayerContractOptionsForClub(clubId: string, dataSource?: DataSource) {
  const source = dataSource ?? await getDataSource();
  const [players, seasons] = await Promise.all([
    source.getRepository(Player).find({ where: { teamId: clubId, isActive: true }, order: { lastNameFr: "ASC", firstNameFr: "ASC" } }),
    source.query("SELECT id, nom, type_competition AS competitionType, requires_player_contract AS requiresPlayerContract FROM saisons ORDER BY date_debut DESC, nom DESC") as Promise<Array<{ id: string; nom: string; competitionType: string; requiresPlayerContract: boolean }>>,
  ]);
  return { players: players.map((player) => ({ id: player.id, name: `${player.firstNameFr} ${player.lastNameFr}`, category: player.category })), seasons: seasons.map((season) => ({ ...season, requiresPlayerContract: Boolean(season.requiresPlayerContract) })) };
}

async function assertAgentIfProvided(agentId: string | null): Promise<void> {
  // migration-v2.md P1-006 : un agent lié à un contrat doit être un agent fédéral actif.
  if (agentId && !(await isAgentActive(agentId))) throw new PlayerContractWorkflowError("L'agent lié n'est pas un agent fédéral actif");
}

export async function createPlayerContractForClub(clubId: string, raw: PlayerContractInput, actor: PlayerContractActor, dataSource?: DataSource): Promise<PlayerContract> {
  const input = normalizeInput(raw); const source = dataSource ?? await getDataSource();
  await assertAgentIfProvided(input.agentId ?? null);
  return source.transaction(async (manager) => {
    const player = await manager.getRepository(Player).findOne({ where: { id: input.playerId, teamId: clubId, isActive: true } });
    if (!player) throw new PlayerContractWorkflowError("Joueur actif introuvable dans ce club");
    const scope = await resolveScope(manager, clubId, input.seasonId);
    const repo = manager.getRepository(PlayerContract);
    const contract = await repo.save(repo.create({ ...input, clubId, ...scope, salary: input.salary ?? null, currency: input.currency ?? null, bonusesJson: input.bonusesJson ?? null, agentId: input.agentId ?? null, status: "DRAFT", federationStatus: "NOT_SUBMITTED", signedAt: null, documentUrl: null }));
    await history(manager, contract.id, actor, { action: "CONTRACT_CREATED", toStatus: "DRAFT", afterValue: { playerId: input.playerId, clubId, seasonId: input.seasonId, contractType: input.contractType } });
    return contract;
  });
}

export async function updatePlayerContractForClub(clubId: string, contractId: string, raw: PlayerContractInput, actor: PlayerContractActor, dataSource?: DataSource): Promise<PlayerContract> {
  const input = normalizeInput(raw); const source = dataSource ?? await getDataSource();
  await assertAgentIfProvided(input.agentId ?? null);
  return source.transaction(async (manager) => {
    const contract = await owned(manager, clubId, contractId, true);
    if (!canEditPlayerContract(contract.status, contract.federationStatus)) throw new PlayerContractWorkflowError("Ce contrat n'est plus modifiable");
    if (input.playerId !== contract.playerId || input.seasonId !== contract.seasonId) throw new PlayerContractWorkflowError("Le joueur et la saison ne peuvent pas être remplacés");
    const before = { contractType: contract.contractType, startDate: contract.startDate, endDate: contract.endDate, salary: contract.salary, currency: contract.currency, agentId: contract.agentId };
    Object.assign(contract, { contractType: input.contractType, startDate: input.startDate, endDate: input.endDate, salary: input.salary ?? null, currency: input.currency ?? null, bonusesJson: input.bonusesJson ?? null, agentId: input.agentId ?? null });
    await manager.getRepository(PlayerContract).save(contract);
    await history(manager, contractId, actor, { action: "CONTRACT_UPDATED", beforeValue: before, afterValue: { contractType: contract.contractType, startDate: contract.startDate, endDate: contract.endDate, salary: contract.salary, currency: contract.currency, agentId: contract.agentId } });
    return contract;
  });
}

export async function addPlayerContractDocument(clubId: string, contractId: string, input: PlayerContractDocumentInput, actor: PlayerContractActor, dataSource?: DataSource): Promise<PlayerContractDocument> {
  const source = dataSource ?? await getDataSource();
  return source.transaction(async (manager) => {
    const contract = await owned(manager, clubId, contractId, true);
    if (!canEditPlayerContract(contract.status, contract.federationStatus)) throw new PlayerContractWorkflowError("Les documents de ce contrat ne sont plus modifiables");
    const repo = manager.getRepository(PlayerContractDocument);
    const previous = await repo.findOne({ where: { contractId, status: "CURRENT" }, order: { version: "DESC" } });
    if (previous) { previous.status = "SUPERSEDED"; await repo.save(previous); }
    const document = await repo.save(repo.create({ contractId, ...input, version: (previous?.version ?? 0) + 1, status: "CURRENT", uploadedBy: actor.userId, uploadedAt: new Date() }));
    contract.documentUrl = input.fileUrl; await manager.getRepository(PlayerContract).save(contract);
    await history(manager, contractId, actor, { action: "DOCUMENT_VERSION_ADDED", afterValue: { documentId: document.id, version: document.version, checksum: document.checksum } });
    return document;
  });
}

export async function listPlayerContractsForClub(clubId: string, dataSource?: DataSource): Promise<PlayerContract[]> {
  const source = dataSource ?? await getDataSource(); return source.getRepository(PlayerContract).find({ where: { clubId }, order: { createdAt: "DESC" } });
}

export async function listHomologatedPlayerContractsForClub(clubId: string, dataSource?: DataSource) {
  const source = dataSource ?? await getDataSource(); const rows = await source.getRepository(PlayerContract).find({ where: { clubId, status: "SIGNED", federationStatus: "APPROVED" }, order: { approvedAt: "DESC" } });
  return rows.filter((contract) => isPlayerContractHomologated(contract.status, contract.federationStatus, contract.endDate)).map((contract) => ({ id: contract.id, playerId: contract.playerId, seasonId: contract.seasonId, contractType: contract.contractType, endDate: contract.endDate }));
}

export async function getPlayerContractBundleForClub(clubId: string, contractId: string, dataSource?: DataSource) {
  const source = dataSource ?? await getDataSource(); const contract = await source.getRepository(PlayerContract).findOne({ where: { id: contractId, clubId } });
  if (!contract) throw new PlayerContractWorkflowError("Contrat joueur introuvable");
  const [documents, events] = await Promise.all([source.getRepository(PlayerContractDocument).find({ where: { contractId }, order: { version: "DESC" } }), source.getRepository(PlayerContractHistory).find({ where: { contractId }, order: { createdAt: "DESC" } })]);
  return { contract, documents, history: events };
}

export async function signPlayerContract(clubId: string, contractId: string, actor: PlayerContractActor, dataSource?: DataSource): Promise<PlayerContract> {
  const source = dataSource ?? await getDataSource(); return source.transaction(async (manager) => {
    const contract = await owned(manager, clubId, contractId, true); assertPlayerContractTransition(contract.status, "SIGNED"); assertPlayerContractDates(contract.startDate, contract.endDate);
    const document = await manager.getRepository(PlayerContractDocument).findOne({ where: { contractId, status: "CURRENT" } });
    if (!document) throw new PlayerContractWorkflowError("Le document signé est obligatoire");
    contract.status = "SIGNED"; contract.signedAt = new Date(); await manager.getRepository(PlayerContract).save(contract);
    await history(manager, contractId, actor, { action: "CONTRACT_SIGNED", fromStatus: "DRAFT", toStatus: "SIGNED" }); return contract;
  });
}

export async function submitPlayerContract(clubId: string, contractId: string, actor: PlayerContractActor, dataSource?: DataSource): Promise<PlayerContract> {
  const source = dataSource ?? await getDataSource(); return source.transaction(async (manager) => {
    const contract = await owned(manager, clubId, contractId, true); assertPlayerContractFederalTransition(contract.federationStatus, "SUBMITTED");
    const document = await manager.getRepository(PlayerContractDocument).findOne({ where: { contractId, status: "CURRENT" } }); assertPlayerContractSubmittable(contract.status, Boolean(document));
    const previous = contract.federationStatus; contract.federationStatus = "SUBMITTED"; contract.submittedAt = new Date(); contract.rejectionReason = null; await manager.getRepository(PlayerContract).save(contract);
    await history(manager, contractId, actor, { action: "FEDERAL_SUBMITTED", fromStatus: previous, toStatus: "SUBMITTED" });
    await new NotificationOutboxService().enqueue(manager, { eventId: `player-contract:${contractId}:SUBMITTED:${contract.submittedAt.toISOString()}`, type: "PLAYER_CONTRACT_SUBMITTED", target: { type: "ROLE", role: "FEDERATION_ADMIN" }, teamId: clubId, category: "REGULATORY", title: "Nouveau contrat joueur", body: "Un club a soumis un contrat joueur pour homologation.", data: { contractId, playerId: contract.playerId, clubId, seasonId: contract.seasonId, federationId: contract.federationId, leagueId: contract.leagueId } });
    return contract;
  });
}

export async function reopenRejectedPlayerContract(clubId: string, contractId: string, actor: PlayerContractActor, dataSource?: DataSource): Promise<PlayerContract> {
  const source = dataSource ?? await getDataSource(); return source.transaction(async (manager) => {
    const contract = await owned(manager, clubId, contractId, true); assertPlayerContractFederalTransition(contract.federationStatus, "NOT_SUBMITTED"); const previous = contract.federationStatus;
    contract.federationStatus = "NOT_SUBMITTED"; contract.rejectionReason = null; await manager.getRepository(PlayerContract).save(contract); await history(manager, contractId, actor, { action: "FEDERAL_REOPENED", fromStatus: previous, toStatus: "NOT_SUBMITTED" }); return contract;
  });
}

export async function terminatePlayerContract(clubId: string, contractId: string, reason: string, actor: PlayerContractActor, dataSource?: DataSource): Promise<PlayerContract> {
  if (!reason.trim()) throw new PlayerContractWorkflowError("Un motif de résiliation est obligatoire"); const source = dataSource ?? await getDataSource();
  return source.transaction(async (manager) => {
    const contract = await owned(manager, clubId, contractId, true); assertPlayerContractTransition(contract.status, "TERMINATED"); const previousBusiness = contract.status; const previousFederal = contract.federationStatus;
    if (contract.federationStatus !== "CANCELLED") assertPlayerContractFederalTransition(contract.federationStatus, "CANCELLED");
    contract.status = "TERMINATED"; contract.federationStatus = "CANCELLED"; contract.terminatedAt = new Date(); contract.terminationReason = reason.trim(); await manager.getRepository(PlayerContract).save(contract);
    await history(manager, contractId, actor, { action: "CONTRACT_TERMINATED", fromStatus: previousBusiness, toStatus: "TERMINATED", reason, beforeValue: { federationStatus: previousFederal }, afterValue: { federationStatus: "CANCELLED" } });
    const registrations = await manager.getRepository(PlayerRegistration).find({ where: { contractId, status: "APPROVED" } });
    for (const registration of registrations) { registration.status = "SUSPENDED"; registration.eligibilityStatus = "INELIGIBLE"; registration.rejectionReason = "Contrat joueur résilié"; await manager.getRepository(PlayerRegistration).save(registration); const auditRepo = manager.getRepository(PlayerRegistrationHistory); await auditRepo.save(auditRepo.create({ registrationId: registration.id, action: "SUSPENDED_CONTRACT_TERMINATED", fromStatus: "APPROVED", toStatus: "SUSPENDED", actorUserId: actor.userId, actorRole: actor.role, reason: reason.trim(), ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent ?? null, beforeValue: { contractId }, afterValue: { eligibilityStatus: "INELIGIBLE" } })); }
    await new NotificationOutboxService().enqueue(manager, { eventId: `player-contract:${contractId}:TERMINATED:${contract.terminatedAt.toISOString()}`, type: "PLAYER_CONTRACT_TERMINATED", target: { type: "ROLE", role: "FEDERATION_ADMIN" }, teamId: clubId, category: "REGULATORY", title: "Contrat joueur résilié", body: "Un club a résilié un contrat joueur.", data: { contractId, playerId: contract.playerId, clubId, reason: reason.trim() } });
    return contract;
  });
}
