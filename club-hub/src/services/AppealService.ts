import type { EntityManager } from "typeorm";
import { Appeal, AppealDocument, AppealEvent } from "@/entities/Appeal";
import { LegalCase } from "@/entities/LegalCase";
import { TeamAffiliation } from "@/entities/TeamAffiliation";
import { getDataSource } from "@/lib/database";
import { AppealWorkflowError, type AppealSourceType } from "../../../packages/regulatory-shared/src/appeals";

export interface AppealActor { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null; }
export interface AppealInput { sourceType: AppealSourceType; sourceId: string; grounds: string; documentUrl?: string | null; documentName?: string | null; }

async function saveEvent(manager: EntityManager, appealId: string, actor: AppealActor, input: { action: string; toStatus?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(AppealEvent);
  await repo.save(repo.create({ appealId, action: input.action, toStatus: input.toStatus ?? null, actorUserId: actor.userId, actorRole: actor.role, afterValue: input.afterValue ?? null, ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent ?? null }));
}

export async function listAppealsForClub(clubId: string) {
  const dataSource = await getDataSource();
  return dataSource.getRepository(Appeal).find({ where: { applicantType: "CLUB", applicantId: clubId }, order: { submittedAt: "DESC" } });
}

export async function getAppealBundleForClub(clubId: string, appealId: string) {
  const dataSource = await getDataSource();
  const appeal = await dataSource.getRepository(Appeal).findOne({ where: { id: appealId, applicantType: "CLUB", applicantId: clubId } });
  if (!appeal) throw new AppealWorkflowError("Appel introuvable");
  const [documents, events] = await Promise.all([
    dataSource.getRepository(AppealDocument).find({ where: { appealId }, order: { uploadedAt: "DESC" } }),
    dataSource.getRepository(AppealEvent).find({ where: { appealId }, order: { createdAt: "DESC" } }),
  ]);
  return { appeal, documents, events };
}

/** Le club dépose un appel en son nom propre (applicantType=CLUB) contre une décision fédérale le concernant. */
export async function submitAppealForClub(clubId: string, input: AppealInput, actor: AppealActor): Promise<Appeal> {
  if (!input.grounds?.trim()) throw new AppealWorkflowError("Les motifs de l'appel sont obligatoires");
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const affiliation = await manager.getRepository(TeamAffiliation).findOne({ where: { teamId: clubId, status: "ACTIVE" } });
    if (!affiliation) throw new AppealWorkflowError("Aucune affiliation réglementaire active pour ce club");
    const repo = manager.getRepository(Appeal);
    const appeal = await repo.save(repo.create({ federationId: affiliation.federationId, leagueId: affiliation.leagueId ?? null, sourceType: input.sourceType, sourceId: input.sourceId, applicantType: "CLUB", applicantId: clubId, grounds: input.grounds.trim(), submittedAt: new Date(), status: "SUBMITTED", createdBy: actor.userId }));
    if (input.sourceType === "LEGAL_CASE") {
      const legalCaseRepo = manager.getRepository(LegalCase);
      const legalCase = await legalCaseRepo.findOne({ where: { id: input.sourceId } });
      if (legalCase && legalCase.status === "DECIDED") { legalCase.status = "APPEALED"; await legalCaseRepo.save(legalCase); }
    }
    if (input.documentUrl && input.documentName) {
      const documentRepo = manager.getRepository(AppealDocument);
      await documentRepo.save(documentRepo.create({ appealId: appeal.id, fileUrl: input.documentUrl, fileName: input.documentName, uploadedBy: actor.userId, uploadedAt: new Date() }));
    }
    await saveEvent(manager, appeal.id, actor, { action: "APPEAL_SUBMITTED", toStatus: "SUBMITTED", afterValue: { sourceType: input.sourceType, sourceId: input.sourceId } });
    return appeal;
  });
}
