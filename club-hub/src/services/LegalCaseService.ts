import type { EntityManager } from "typeorm";
import { LegalCase, LegalCaseDecision, LegalCaseDocument, LegalCaseEvent, LegalCaseHearing } from "@/entities/LegalCase";
import { getDataSource } from "@/lib/database";
import { isLegalCaseOpen, LegalCaseWorkflowError } from "../../../packages/regulatory-shared/src/legalCase";

export interface LegalCaseActor { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null; }
export interface LegalCaseDocumentInput { fileUrl: string; fileName: string; mimeType: string; size: number; checksum: string; note?: string | null; }

/**
 * Lecture des litiges où le club est partie (demandeur OU défendeur), et
 * seule écriture autorisée côté club-hub : dépôt de documents/réponse. La
 * fédération reste seule à instruire et décider (voir federation-hub/src/lib/legalCases.ts).
 */
export async function listLegalCasesForClub(clubId: string) {
  const dataSource = await getDataSource();
  const cases = await dataSource.getRepository(LegalCase).createQueryBuilder("legalCase")
    .where("(legalCase.claimant_type = 'CLUB' AND legalCase.claimant_id = :clubId) OR (legalCase.respondent_type = 'CLUB' AND legalCase.respondent_id = :clubId)", { clubId })
    .orderBy("legalCase.filed_at", "DESC")
    .getMany();
  return cases.map((legalCase) => Object.assign(legalCase, { partyRole: legalCase.claimantType === "CLUB" && legalCase.claimantId === clubId ? "CLAIMANT" : "RESPONDENT" }));
}

async function ownedCase(manager: EntityManager, clubId: string, caseId: string): Promise<LegalCase> {
  const legalCase = await manager.getRepository(LegalCase).findOne({ where: { id: caseId } });
  if (!legalCase) throw new LegalCaseWorkflowError("Litige introuvable");
  const isParty = (legalCase.claimantType === "CLUB" && legalCase.claimantId === clubId) || (legalCase.respondentType === "CLUB" && legalCase.respondentId === clubId);
  if (!isParty) throw new LegalCaseWorkflowError("Litige introuvable");
  return legalCase;
}

export async function getLegalCaseBundleForClub(clubId: string, caseId: string) {
  const dataSource = await getDataSource();
  const legalCase = await ownedCase(dataSource.manager, clubId, caseId);
  const [documents, hearings, decisions, events] = await Promise.all([
    dataSource.getRepository(LegalCaseDocument).find({ where: { caseId }, order: { uploadedAt: "DESC" } }),
    dataSource.getRepository(LegalCaseHearing).find({ where: { caseId }, order: { scheduledAt: "DESC" } }),
    dataSource.getRepository(LegalCaseDecision).find({ where: { caseId }, order: { decidedAt: "DESC" } }),
    dataSource.getRepository(LegalCaseEvent).find({ where: { caseId }, order: { createdAt: "DESC" } }),
  ]);
  return { legalCase: Object.assign(legalCase, { partyRole: legalCase.claimantType === "CLUB" && legalCase.claimantId === clubId ? "CLAIMANT" : "RESPONDENT" }), documents, hearings, decisions, events };
}

/** Dépôt d'une réponse/pièce par le club, tant que le dossier n'est pas clos. */
export async function addLegalCaseResponse(clubId: string, caseId: string, input: LegalCaseDocumentInput, actor: LegalCaseActor): Promise<LegalCaseDocument> {
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const legalCase = await ownedCase(manager, clubId, caseId);
    if (!isLegalCaseOpen(legalCase.status)) throw new LegalCaseWorkflowError("Ce litige n'accepte plus de nouvelle pièce");
    const submittedByType = legalCase.claimantType === "CLUB" && legalCase.claimantId === clubId ? "CLAIMANT" : "RESPONDENT";
    const documentRepo = manager.getRepository(LegalCaseDocument);
    const previous = await documentRepo.count({ where: { caseId } });
    const document = await documentRepo.save(documentRepo.create({ caseId, fileUrl: input.fileUrl, fileName: input.fileName, mimeType: input.mimeType, size: input.size, checksum: input.checksum, version: previous + 1, submittedByType, uploadedBy: actor.userId, uploadedAt: new Date() }));
    const eventRepo = manager.getRepository(LegalCaseEvent);
    await eventRepo.save(eventRepo.create({ caseId, action: "PARTY_DOCUMENT_ADDED", actorUserId: actor.userId, actorRole: actor.role, reason: input.note ?? null, afterValue: { documentId: document.id, submittedByType }, ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent ?? null }));
    return document;
  });
}
