import type { DataSource, EntityManager } from "typeorm";
import {
  assertPersonLicenseTransition,
  isPersonLicenseEditable,
  PersonLicenseWorkflowError,
  type PersonLicenseType,
} from "../../../packages/regulatory-shared/src/personLicensing";
import { PersonLicense, PersonLicenseDocument, PersonLicenseHistory } from "@/entities/PersonLicense";
import { Player } from "@/entities/Player";
import { Staff } from "@/entities/Staff";
import { TeamAffiliation } from "@/entities/TeamAffiliation";
import { getDataSource } from "@/lib/database";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";

export interface PersonLicenseActor {
  userId: string;
  role: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreatePersonLicenseInput {
  personType: PersonLicenseType;
  personReferenceId: string;
  seasonId: string;
  licenseType: string;
  category?: string | null;
}

const CLUB_PERSON_TYPES: readonly PersonLicenseType[] = ["PLAYER", "COACH", "STAFF", "MEDICAL", "DIRECTOR"];

async function addHistory(
  manager: EntityManager,
  licenseId: string,
  actor: PersonLicenseActor,
  input: {
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    reason?: string | null;
    beforeValue?: Record<string, unknown> | null;
    afterValue?: Record<string, unknown> | null;
  },
): Promise<void> {
  const repo = manager.getRepository(PersonLicenseHistory);
  await repo.save(repo.create({
    licenseId,
    action: input.action,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
    actorUserId: actor.userId,
    actorRole: actor.role,
    reason: input.reason ?? null,
    beforeValue: input.beforeValue ?? null,
    afterValue: input.afterValue ?? null,
    ipAddress: actor.ipAddress ?? null,
    userAgent: actor.userAgent ?? null,
  }));
}

async function getOwnedLicense(
  manager: EntityManager,
  clubId: string,
  licenseId: string,
  lock = false,
): Promise<PersonLicense> {
  let query = manager.getRepository(PersonLicense)
    .createQueryBuilder("license")
    .where("license.id = :licenseId", { licenseId })
    .andWhere("license.club_id = :clubId", { clubId });
  if (lock) query = query.setLock("pessimistic_write");
  const license = await query.getOne();
  if (!license) throw new PersonLicenseWorkflowError("Demande de licence introuvable");
  return license;
}

async function assertOwnedPerson(
  manager: EntityManager,
  clubId: string,
  personType: PersonLicenseType,
  personReferenceId: string,
): Promise<void> {
  if (!CLUB_PERSON_TYPES.includes(personType)) {
    throw new PersonLicenseWorkflowError("Ce type de licence n'est pas demandé par un club");
  }
  if (personType === "PLAYER") {
    const player = await manager.getRepository(Player).findOne({ where: { id: personReferenceId, teamId: clubId } });
    if (!player) throw new PersonLicenseWorkflowError("Joueur introuvable dans ce club");
    return;
  }

  const staffId = Number(personReferenceId);
  if (!Number.isSafeInteger(staffId)) throw new PersonLicenseWorkflowError("Référence staff invalide");
  const staff = await manager.getRepository(Staff).findOne({ where: { id: staffId, teamId: clubId } });
  if (!staff) throw new PersonLicenseWorkflowError("Membre du staff introuvable dans ce club");
  if (personType === "COACH" && !["COACH", "ADJOINT", "PREPARATEUR"].includes(staff.staffType)) {
    throw new PersonLicenseWorkflowError("La personne sélectionnée n'est pas un entraîneur");
  }
  if (personType === "MEDICAL" && !["KINE", "MEDECIN"].includes(staff.staffType)) {
    throw new PersonLicenseWorkflowError("La personne sélectionnée n'appartient pas au staff médical");
  }
}

export async function listPersonLicenseCandidates(clubId: string, dataSource?: DataSource) {
  const source = dataSource ?? await getDataSource();
  const [players, staff] = await Promise.all([
    source.getRepository(Player).find({ where: { teamId: clubId, isActive: true }, order: { lastNameFr: "ASC", firstNameFr: "ASC" } }),
    source.getRepository(Staff).find({ where: { teamId: clubId }, order: { lastNameFr: "ASC", firstNameFr: "ASC" } }),
  ]);
  return {
    players: players.map((person) => ({ id: person.id, name: `${person.firstNameFr} ${person.lastNameFr}`, category: person.category })),
    staff: staff.map((person) => ({ id: String(person.id), name: `${person.firstNameFr} ${person.lastNameFr}`, category: person.category, staffType: person.staffType })),
  };
}

export async function createPersonLicenseForClub(
  clubId: string,
  input: CreatePersonLicenseInput,
  actor: PersonLicenseActor,
  dataSource?: DataSource,
): Promise<PersonLicense> {
  const source = dataSource ?? await getDataSource();
  return source.transaction(async (manager) => {
    await assertOwnedPerson(manager, clubId, input.personType, input.personReferenceId);
    const affiliation = await manager.getRepository(TeamAffiliation).findOne({ where: { teamId: clubId, status: "ACTIVE" } });
    if (!affiliation) throw new PersonLicenseWorkflowError("Le club doit disposer d'une affiliation active");
    const seasons = await manager.query("SELECT id FROM saisons WHERE id = ? LIMIT 1", [input.seasonId]) as Array<{ id: string }>;
    if (!seasons[0]) throw new PersonLicenseWorkflowError("Saison introuvable");
    if (!input.licenseType.trim()) throw new PersonLicenseWorkflowError("Le type de licence est obligatoire");

    const repo = manager.getRepository(PersonLicense);
    const existing = await repo.findOne({ where: {
      personType: input.personType,
      personReferenceId: input.personReferenceId,
      federationId: affiliation.federationId,
      seasonId: input.seasonId,
      licenseType: input.licenseType.trim(),
    } });
    if (existing) return existing;

    const license = await repo.save(repo.create({
      personType: input.personType,
      personReferenceId: input.personReferenceId,
      userId: null,
      clubId,
      federationId: affiliation.federationId,
      leagueId: affiliation.leagueId ?? null,
      seasonId: input.seasonId,
      licenseType: input.licenseType.trim(),
      licenseNumber: null,
      category: input.category?.trim() || null,
      status: "DRAFT",
    }));
    await addHistory(manager, license.id, actor, {
      action: "LICENSE_CREATED",
      toStatus: "DRAFT",
      afterValue: { personType: license.personType, personReferenceId: license.personReferenceId, clubId, seasonId: license.seasonId },
    });
    return license;
  });
}

export async function listPersonLicensesForClub(clubId: string, dataSource?: DataSource): Promise<PersonLicense[]> {
  const source = dataSource ?? await getDataSource();
  return source.getRepository(PersonLicense).find({ where: { clubId }, order: { createdAt: "DESC" } });
}

export async function getPersonLicenseBundleForClub(clubId: string, licenseId: string, dataSource?: DataSource) {
  const source = dataSource ?? await getDataSource();
  const license = await source.getRepository(PersonLicense).findOne({ where: { id: licenseId, clubId } });
  if (!license) throw new PersonLicenseWorkflowError("Demande de licence introuvable");
  const [documents, history] = await Promise.all([
    source.getRepository(PersonLicenseDocument).find({ where: { licenseId }, order: { uploadedAt: "DESC" } }),
    source.getRepository(PersonLicenseHistory).find({ where: { licenseId }, order: { createdAt: "DESC" } }),
  ]);
  return { license, documents, history };
}

export async function addPersonLicenseDocument(
  clubId: string,
  licenseId: string,
  actor: PersonLicenseActor,
  input: { documentType: string; fileUrl: string; fileName: string; mimeType: string; size: number; checksum: string },
  dataSource?: DataSource,
): Promise<PersonLicenseDocument> {
  const source = dataSource ?? await getDataSource();
  return source.transaction(async (manager) => {
    const license = await getOwnedLicense(manager, clubId, licenseId, true);
    if (!isPersonLicenseEditable(license.status)) throw new PersonLicenseWorkflowError("La demande n'est pas modifiable");
    const documentType = input.documentType.trim();
    if (!documentType) throw new PersonLicenseWorkflowError("Le type de document est obligatoire");
    const repo = manager.getRepository(PersonLicenseDocument);
    const previous = await repo.find({ where: { licenseId, documentType }, order: { version: "DESC" } });
    for (const document of previous.filter((item) => item.status !== "SUPERSEDED")) {
      document.status = "SUPERSEDED";
      await repo.save(document);
    }
    const document = await repo.save(repo.create({
      licenseId,
      documentType,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
      checksum: input.checksum,
      version: (previous[0]?.version ?? 0) + 1,
      status: "PENDING",
      uploadedBy: actor.userId,
      uploadedAt: new Date(),
    }));
    await addHistory(manager, licenseId, actor, {
      action: "DOCUMENT_UPLOADED",
      afterValue: { documentId: document.id, documentType, version: document.version, checksum: document.checksum },
    });
    return document;
  });
}

export async function reopenRejectedPersonLicense(
  clubId: string,
  licenseId: string,
  actor: PersonLicenseActor,
  dataSource?: DataSource,
): Promise<PersonLicense> {
  const source = dataSource ?? await getDataSource();
  return source.transaction(async (manager) => {
    const license = await getOwnedLicense(manager, clubId, licenseId, true);
    assertPersonLicenseTransition(license.status, "DRAFT");
    const previous = license.status;
    license.status = "DRAFT";
    license.rejectionReason = null;
    await manager.getRepository(PersonLicense).save(license);
    await addHistory(manager, licenseId, actor, { action: "LICENSE_REOPENED", fromStatus: previous, toStatus: "DRAFT" });
    return license;
  });
}

export async function submitPersonLicense(
  clubId: string,
  licenseId: string,
  actor: PersonLicenseActor,
  dataSource?: DataSource,
): Promise<PersonLicense> {
  const source = dataSource ?? await getDataSource();
  return source.transaction(async (manager) => {
    const license = await getOwnedLicense(manager, clubId, licenseId, true);
    assertPersonLicenseTransition(license.status, "SUBMITTED");
    const documentCount = await manager.getRepository(PersonLicenseDocument)
      .createQueryBuilder("document")
      .where("document.license_id = :licenseId", { licenseId })
      .andWhere("document.status <> :status", { status: "SUPERSEDED" })
      .getCount();
    if (documentCount === 0) throw new PersonLicenseWorkflowError("Au moins une pièce justificative est obligatoire");
    const previous = license.status;
    license.status = "SUBMITTED";
    license.requestedAt = new Date();
    license.rejectionReason = null;
    await manager.getRepository(PersonLicense).save(license);
    await addHistory(manager, licenseId, actor, { action: "STATUS_SUBMITTED", fromStatus: previous, toStatus: "SUBMITTED" });
    await new NotificationOutboxService().enqueue(manager, {
      eventId: `person-license:${licenseId}:SUBMITTED:${license.requestedAt.toISOString()}`,
      type: "PERSON_LICENSE_SUBMITTED",
      target: { type: "ROLE", role: "FEDERATION_ADMIN" },
      teamId: clubId,
      category: "REGULATORY",
      title: "Nouvelle demande de licence individuelle",
      body: `Une demande ${license.personType} a été soumise pour examen.`,
      data: { licenseId, clubId, federationId: license.federationId, leagueId: license.leagueId, personType: license.personType },
    });
    return license;
  });
}
