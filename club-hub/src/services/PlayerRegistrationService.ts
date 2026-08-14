import type { DataSource, EntityManager } from "typeorm";
import { PersonLicense } from "@/entities/PersonLicense";
import { Player } from "@/entities/Player";
import { PlayerRegistration, PlayerRegistrationHistory } from "@/entities/PlayerRegistration";
import { getDataSource } from "@/lib/database";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import { isPersonLicenseActive } from "../../../packages/regulatory-shared/src/personLicensing";
import { assertPlayerRegistrationTransition, eligibilityForRegistrationStatus, PlayerRegistrationWorkflowError } from "../../../packages/regulatory-shared/src/playerRegistration";

export interface PlayerRegistrationActor { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null; }

async function addHistory(manager: EntityManager, registrationId: string, actor: PlayerRegistrationActor, input: { action: string; fromStatus?: string | null; toStatus?: string | null; reason?: string | null; beforeValue?: Record<string, unknown> | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(PlayerRegistrationHistory);
  await repo.save(repo.create({ registrationId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: actor.userId, actorRole: actor.role, reason: input.reason ?? null, beforeValue: input.beforeValue ?? null, afterValue: input.afterValue ?? null, ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent ?? null }));
}

async function ownedRegistration(manager: EntityManager, clubId: string, registrationId: string, lock = false): Promise<PlayerRegistration> {
  let query = manager.getRepository(PlayerRegistration).createQueryBuilder("registration").where("registration.id = :registrationId", { registrationId }).andWhere("registration.club_id = :clubId", { clubId });
  if (lock) query = query.setLock("pessimistic_write");
  const registration = await query.getOne();
  if (!registration) throw new PlayerRegistrationWorkflowError("Enregistrement joueur introuvable");
  return registration;
}

async function activePlayerLicense(manager: EntityManager, clubId: string, playerId: string, seasonId: string, licenseId: string): Promise<PersonLicense> {
  const license = await manager.getRepository(PersonLicense).findOne({ where: { id: licenseId, clubId, personReferenceId: playerId, personType: "PLAYER", seasonId } });
  if (!license || !isPersonLicenseActive(license.status, license.expiresAt)) {
    throw new PlayerRegistrationWorkflowError("Une licence PLAYER approuvée et non expirée est obligatoire");
  }
  return license;
}

export async function listRegistrationCandidates(clubId: string, dataSource?: DataSource) {
  const source = dataSource ?? await getDataSource();
  const [players, licenses] = await Promise.all([
    source.getRepository(Player).find({ where: { teamId: clubId, isActive: true }, order: { lastNameFr: "ASC", firstNameFr: "ASC" } }),
    source.getRepository(PersonLicense).find({ where: { clubId, personType: "PLAYER", status: "APPROVED" }, order: { createdAt: "DESC" } }),
  ]);
  return {
    players: players.map((player) => ({ id: player.id, name: `${player.firstNameFr} ${player.lastNameFr}`, category: player.category })),
    licenses: licenses.filter((license) => isPersonLicenseActive(license.status, license.expiresAt)).map((license) => ({ id: license.id, playerId: license.personReferenceId, seasonId: license.seasonId, number: license.licenseNumber, expiresAt: license.expiresAt })),
  };
}

export async function createPlayerRegistrationForClub(clubId: string, input: { playerId: string; seasonId: string; licenseId: string }, actor: PlayerRegistrationActor, dataSource?: DataSource): Promise<PlayerRegistration> {
  const source = dataSource ?? await getDataSource();
  return source.transaction(async (manager) => {
    const player = await manager.getRepository(Player).findOne({ where: { id: input.playerId, teamId: clubId, isActive: true } });
    if (!player) throw new PlayerRegistrationWorkflowError("Joueur actif introuvable dans ce club");
    const license = await activePlayerLicense(manager, clubId, input.playerId, input.seasonId, input.licenseId);
    const repo = manager.getRepository(PlayerRegistration);
    const existing = await repo.findOne({ where: { playerId: input.playerId, clubId, seasonId: input.seasonId } });
    if (existing) return existing;
    const registration = await repo.save(repo.create({ playerId: input.playerId, clubId, seasonId: input.seasonId, federationId: license.federationId, leagueId: license.leagueId ?? null, licenseId: license.id, contractId: null, status: "DRAFT", eligibilityStatus: "PENDING", registeredAt: null, validatedBy: null, validatedAt: null, rejectionReason: null }));
    await addHistory(manager, registration.id, actor, { action: "REGISTRATION_CREATED", toStatus: "DRAFT", afterValue: { playerId: input.playerId, clubId, seasonId: input.seasonId, licenseId: license.id } });
    return registration;
  });
}

export async function listPlayerRegistrationsForClub(clubId: string, dataSource?: DataSource): Promise<PlayerRegistration[]> {
  const source = dataSource ?? await getDataSource();
  return source.getRepository(PlayerRegistration).find({ where: { clubId }, order: { createdAt: "DESC" } });
}

export async function getPlayerRegistrationBundleForClub(clubId: string, registrationId: string, dataSource?: DataSource) {
  const source = dataSource ?? await getDataSource();
  const registration = await source.getRepository(PlayerRegistration).findOne({ where: { id: registrationId, clubId } });
  if (!registration) throw new PlayerRegistrationWorkflowError("Enregistrement joueur introuvable");
  const history = await source.getRepository(PlayerRegistrationHistory).find({ where: { registrationId }, order: { createdAt: "DESC" } });
  return { registration, history };
}

export async function reopenRejectedPlayerRegistration(clubId: string, registrationId: string, actor: PlayerRegistrationActor, dataSource?: DataSource): Promise<PlayerRegistration> {
  const source = dataSource ?? await getDataSource();
  return source.transaction(async (manager) => {
    const registration = await ownedRegistration(manager, clubId, registrationId, true);
    assertPlayerRegistrationTransition(registration.status, "DRAFT");
    const previous = registration.status;
    registration.status = "DRAFT"; registration.eligibilityStatus = eligibilityForRegistrationStatus("DRAFT"); registration.rejectionReason = null;
    await manager.getRepository(PlayerRegistration).save(registration);
    await addHistory(manager, registrationId, actor, { action: "REGISTRATION_REOPENED", fromStatus: previous, toStatus: "DRAFT" });
    return registration;
  });
}

export async function submitPlayerRegistration(clubId: string, registrationId: string, actor: PlayerRegistrationActor, dataSource?: DataSource): Promise<PlayerRegistration> {
  const source = dataSource ?? await getDataSource();
  return source.transaction(async (manager) => {
    const registration = await ownedRegistration(manager, clubId, registrationId, true);
    assertPlayerRegistrationTransition(registration.status, "SUBMITTED");
    await activePlayerLicense(manager, clubId, registration.playerId, registration.seasonId, registration.licenseId);
    const previous = registration.status;
    registration.status = "SUBMITTED"; registration.eligibilityStatus = "PENDING"; registration.registeredAt = new Date(); registration.rejectionReason = null;
    await manager.getRepository(PlayerRegistration).save(registration);
    await addHistory(manager, registrationId, actor, { action: "STATUS_SUBMITTED", fromStatus: previous, toStatus: "SUBMITTED" });
    await new NotificationOutboxService().enqueue(manager, { eventId: `player-registration:${registrationId}:SUBMITTED:${registration.registeredAt.toISOString()}`, type: "PLAYER_REGISTRATION_SUBMITTED", target: { type: "ROLE", role: "FEDERATION_ADMIN" }, teamId: clubId, category: "REGULATORY", title: "Nouvel enregistrement joueur", body: "Un club a soumis un joueur pour enregistrement réglementaire.", data: { registrationId, playerId: registration.playerId, clubId, seasonId: registration.seasonId, federationId: registration.federationId, leagueId: registration.leagueId } });
    return registration;
  });
}
