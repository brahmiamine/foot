import type { DataSource, EntityManager } from "typeorm";
import {
  assertClubLicenseTransition,
  isClubEditableStatus,
  ClubLicenseWorkflowError,
  type ClubLicenseRequirementCategory,
} from "../../../packages/regulatory-shared/src/clubLicensing";
import { getDataSource } from "@/lib/database";
import {
  ClubLicenseApplication,
  ClubLicenseDocument,
  ClubLicenseHistory,
  ClubLicenseRequirement,
} from "@/entities/ClubLicense";
import { TeamAffiliation } from "@/entities/TeamAffiliation";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import { isClubLicensingWindowOpen } from "@/services/SeasonRegulatoryCycleService";

export interface ClubLicenseActor {
  userId: string;
  role: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface DefaultRequirement {
  category: ClubLicenseRequirementCategory;
  code: string;
  label: string;
  description: string;
}

const DEFAULT_REQUIREMENTS: readonly DefaultRequirement[] = [
  { category: "SPORTING", code: "SPORTING_PROGRAM", label: "Programme sportif", description: "Organisation sportive et équipes engagées pour la saison." },
  { category: "INFRASTRUCTURE", code: "STADIUM_COMPLIANCE", label: "Infrastructure et stade", description: "Justificatifs de disponibilité et de conformité du stade." },
  { category: "ADMINISTRATIVE", code: "CLUB_ADMINISTRATION", label: "Situation administrative", description: "Coordonnées officielles et dossier administratif à jour." },
  { category: "LEGAL", code: "LEGAL_EXISTENCE", label: "Existence juridique", description: "Statuts, récépissé et représentation légale du club." },
  { category: "PERSONNEL", code: "KEY_PERSONNEL", label: "Personnel obligatoire", description: "Responsables et fonctions réglementaires obligatoires." },
  { category: "MEDICAL", code: "MEDICAL_ORGANIZATION", label: "Organisation médicale", description: "Attestation d'organisation médicale sans diagnostic individuel." },
  { category: "FINANCIAL", code: "FINANCIAL_COMPLIANCE", label: "Conformité financière", description: "Pièces financières et absence d'impayés réglementaires." },
];

async function addHistory(
  manager: EntityManager,
  applicationId: string,
  actor: ClubLicenseActor,
  input: {
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    reason?: string | null;
    beforeValue?: Record<string, unknown> | null;
    afterValue?: Record<string, unknown> | null;
  },
): Promise<void> {
  const repo = manager.getRepository(ClubLicenseHistory);
  await repo.save(repo.create({
    applicationId,
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

async function getOwnedApplication(
  manager: EntityManager,
  applicationId: string,
  clubId: string,
  lock = false,
): Promise<ClubLicenseApplication> {
  let query = manager.getRepository(ClubLicenseApplication)
    .createQueryBuilder("application")
    .where("application.id = :applicationId", { applicationId })
    .andWhere("application.club_id = :clubId", { clubId });
  if (lock) query = query.setLock("pessimistic_write");
  const application = await query.getOne();
  if (!application) throw new ClubLicenseWorkflowError("Dossier de licence introuvable");
  return application;
}

export async function createClubLicenseApplication(
  clubId: string,
  seasonId: string,
  actor: ClubLicenseActor,
  dataSource?: DataSource,
): Promise<ClubLicenseApplication> {
  const source = dataSource ?? await getDataSource();
  return source.transaction(async (manager) => {
    const existing = await manager.getRepository(ClubLicenseApplication).findOne({
      where: { clubId, seasonId },
    });
    if (existing) return existing;

    const affiliation = await manager.getRepository(TeamAffiliation)
      .createQueryBuilder("affiliation")
      .setLock("pessimistic_read")
      .where("affiliation.team_id = :clubId", { clubId })
      .andWhere("affiliation.status = :status", { status: "ACTIVE" })
      .getOne();
    if (!affiliation) {
      throw new ClubLicenseWorkflowError("Le club doit disposer d'une affiliation fédérale active");
    }

    const seasons = await manager.query(
      "SELECT id, date_fin AS dateFin FROM saisons WHERE id = ? LIMIT 1",
      [seasonId],
    ) as Array<{ id: string; dateFin: string | Date | null }>;
    const season = seasons[0];
    if (!season) throw new ClubLicenseWorkflowError("Saison introuvable");

    const applicationRepo = manager.getRepository(ClubLicenseApplication);
    const application = await applicationRepo.save(applicationRepo.create({
      clubId,
      seasonId,
      federationId: affiliation.federationId,
      leagueId: affiliation.leagueId ?? null,
      status: "DRAFT",
      submittedAt: null,
      reviewStartedAt: null,
      approvedAt: null,
      rejectedAt: null,
      expiresAt: season.dateFin ? new Date(season.dateFin) : null,
      reviewerUserId: null,
      rejectionReason: null,
    }));

    const requirementRepo = manager.getRepository(ClubLicenseRequirement);
    await requirementRepo.save(DEFAULT_REQUIREMENTS.map((requirement) => requirementRepo.create({
      applicationId: application.id,
      ...requirement,
      mandatory: true,
      status: "PENDING",
      reviewComment: null,
      waiverReason: null,
      reviewedBy: null,
      reviewedAt: null,
    })));
    await addHistory(manager, application.id, actor, {
      action: "APPLICATION_CREATED",
      toStatus: "DRAFT",
      afterValue: { clubId, seasonId, federationId: affiliation.federationId, leagueId: affiliation.leagueId ?? null },
    });
    return application;
  });
}

export async function listClubLicenseApplicationsForClub(
  clubId: string,
  dataSource?: DataSource,
): Promise<ClubLicenseApplication[]> {
  const source = dataSource ?? await getDataSource();
  return source.getRepository(ClubLicenseApplication).find({
    where: { clubId },
    order: { createdAt: "DESC" },
  });
}

export async function getClubLicenseBundleForClub(
  clubId: string,
  applicationId: string,
  dataSource?: DataSource,
) {
  const source = dataSource ?? await getDataSource();
  const application = await source.getRepository(ClubLicenseApplication).findOne({
    where: { id: applicationId, clubId },
  });
  if (!application) throw new ClubLicenseWorkflowError("Dossier de licence introuvable");
  const [requirements, documents, history] = await Promise.all([
    source.getRepository(ClubLicenseRequirement).find({ where: { applicationId }, order: { category: "ASC", code: "ASC" } }),
    source.getRepository(ClubLicenseDocument).find({ where: { applicationId }, order: { uploadedAt: "DESC" } }),
    source.getRepository(ClubLicenseHistory).find({ where: { applicationId }, order: { createdAt: "DESC" } }),
  ]);
  return { application, requirements, documents, history };
}

export interface AddClubLicenseDocumentInput {
  requirementId: string;
  documentType: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  checksum: string;
}

export async function addClubLicenseDocument(
  clubId: string,
  applicationId: string,
  actor: ClubLicenseActor,
  input: AddClubLicenseDocumentInput,
  dataSource?: DataSource,
): Promise<ClubLicenseDocument> {
  const source = dataSource ?? await getDataSource();
  return source.transaction(async (manager) => {
    const application = await getOwnedApplication(manager, applicationId, clubId, true);
    if (!isClubEditableStatus(application.status)) {
      throw new ClubLicenseWorkflowError("Le dossier n'est pas modifiable dans son statut actuel");
    }
    const requirement = await manager.getRepository(ClubLicenseRequirement).findOne({
      where: { id: input.requirementId, applicationId },
    });
    if (!requirement) throw new ClubLicenseWorkflowError("Exigence introuvable");
    if (input.documentType !== requirement.code) {
      throw new ClubLicenseWorkflowError("Le type de document doit correspondre à l'exigence");
    }

    const repo = manager.getRepository(ClubLicenseDocument);
    const previous = await repo.find({
      where: { applicationId, documentType: input.documentType },
      order: { version: "DESC" },
    });
    for (const document of previous.filter((item) => item.status !== "SUPERSEDED")) {
      document.status = "SUPERSEDED";
      await repo.save(document);
    }
    const document = await repo.save(repo.create({
      applicationId,
      requirementId: requirement.id,
      documentType: input.documentType,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: String(input.size),
      checksum: input.checksum,
      version: (previous[0]?.version ?? 0) + 1,
      uploadedBy: actor.userId,
      status: "PENDING",
      reviewComment: null,
      reviewedBy: null,
      reviewedAt: null,
    }));
    await addHistory(manager, applicationId, actor, {
      action: "DOCUMENT_UPLOADED",
      afterValue: { documentId: document.id, requirementId: requirement.id, documentType: document.documentType, version: document.version, checksum: document.checksum },
    });
    return document;
  });
}

export async function submitClubLicenseApplication(
  clubId: string,
  applicationId: string,
  actor: ClubLicenseActor,
  dataSource?: DataSource,
): Promise<ClubLicenseApplication> {
  const source = dataSource ?? await getDataSource();
  return source.transaction(async (manager) => {
    const application = await getOwnedApplication(manager, applicationId, clubId, true);
    assertClubLicenseTransition(application.status, "SUBMITTED");

    // migration-v2.md P0-011 : la campagne de licence club doit être ouverte pour cette saison.
    if (!(await isClubLicensingWindowOpen(application.seasonId))) {
      throw new ClubLicenseWorkflowError("La campagne de licence club n'est pas ouverte pour cette saison");
    }

    const requirements = await manager.getRepository(ClubLicenseRequirement).find({
      where: { applicationId },
    });
    const documents = await manager.getRepository(ClubLicenseDocument).find({
      where: { applicationId },
    });
    const coveredRequirementIds = new Set(
      documents.filter((document) => document.status !== "SUPERSEDED").map((document) => document.requirementId),
    );
    const missing = requirements.filter(
      (requirement) => requirement.mandatory && !coveredRequirementIds.has(requirement.id),
    );
    if (missing.length > 0) {
      throw new ClubLicenseWorkflowError(
        `${missing.length} document(s) obligatoire(s) manquent avant la soumission`,
      );
    }

    const previous = application.status;
    application.status = "SUBMITTED";
    application.submittedAt = new Date();
    application.rejectionReason = null;
    await manager.getRepository(ClubLicenseApplication).save(application);
    await addHistory(manager, applicationId, actor, {
      action: "STATUS_SUBMITTED",
      fromStatus: previous,
      toStatus: "SUBMITTED",
      beforeValue: { status: previous },
      afterValue: { status: "SUBMITTED" },
    });

    await new NotificationOutboxService().enqueue(manager, {
      eventId: `club-license:${applicationId}:SUBMITTED:${application.submittedAt.toISOString()}`,
      type: "CLUB_LICENSE_SUBMITTED",
      target: { type: "ROLE", role: "FEDERATION_ADMIN" },
      teamId: clubId,
      category: "REGULATORY",
      title: "Nouveau dossier de licence club",
      body: "Un club a soumis son dossier de licence pour examen.",
      data: { applicationId, clubId, federationId: application.federationId, leagueId: application.leagueId },
    });
    return application;
  });
}
