import type { EntityManager } from "typeorm";
import { FinancialCompliance, FinancialComplianceHistory } from "@/entities/FinancialCompliance";
import { TeamAffiliation } from "@/entities/TeamAffiliation";
import { getDataSource } from "@/lib/database";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import { assertFinancialComplianceTransition, canEditFinancialCompliance, FinancialComplianceWorkflowError } from "../../../packages/regulatory-shared/src/financialCompliance";

export interface FinancialComplianceActor { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null; }
export interface FinancialComplianceInput { budgetForecast?: string | null; payrollForecast?: string | null; playerDebts?: string; staffDebts?: string; taxDebts?: string; federationDebts?: string; otherDebts?: string; currency?: string; auditedAccountsUrl?: string | null; auditorName?: string | null; }

async function history(manager: EntityManager, complianceId: string, actor: FinancialComplianceActor, input: { action: string; fromStatus?: string | null; toStatus?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(FinancialComplianceHistory);
  await repo.save(repo.create({ complianceId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: actor.userId, actorRole: actor.role, afterValue: input.afterValue ?? null, ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent ?? null }));
}

function normalize(input: FinancialComplianceInput) {
  return {
    budgetForecast: input.budgetForecast || null,
    payrollForecast: input.payrollForecast || null,
    playerDebts: input.playerDebts || "0",
    staffDebts: input.staffDebts || "0",
    taxDebts: input.taxDebts || "0",
    federationDebts: input.federationDebts || "0",
    otherDebts: input.otherDebts || "0",
    currency: input.currency?.trim().toUpperCase() || "TND",
    auditedAccountsUrl: input.auditedAccountsUrl || null,
    auditorName: input.auditorName || null,
  };
}

export async function listFinancialComplianceForClub(clubId: string) {
  const dataSource = await getDataSource();
  return dataSource.getRepository(FinancialCompliance).find({ where: { clubId }, order: { createdAt: "DESC" } });
}

export async function getFinancialComplianceBundleForClub(clubId: string, id: string) {
  const dataSource = await getDataSource();
  const item = await dataSource.getRepository(FinancialCompliance).findOne({ where: { id, clubId } });
  if (!item) throw new FinancialComplianceWorkflowError("Dossier financier introuvable");
  const history = await dataSource.getRepository(FinancialComplianceHistory).find({ where: { complianceId: id }, order: { createdAt: "DESC" } });
  return { compliance: item, history };
}

/** Un seul dossier DRAFT par club/saison : réutilise le brouillon existant plutôt que d'en créer un doublon (contrainte d'unicité club+saison en base). */
export async function upsertFinancialComplianceDraft(clubId: string, seasonId: string, raw: FinancialComplianceInput, actor: FinancialComplianceActor): Promise<FinancialCompliance> {
  const input = normalize(raw);
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const affiliation = await manager.getRepository(TeamAffiliation).findOne({ where: { teamId: clubId, status: "ACTIVE" } });
    if (!affiliation) throw new FinancialComplianceWorkflowError("Aucune affiliation réglementaire active pour ce club");
    const repo = manager.getRepository(FinancialCompliance);
    let item = await repo.findOne({ where: { clubId, seasonId } });
    if (item) {
      if (!canEditFinancialCompliance(item.status)) throw new FinancialComplianceWorkflowError("Ce dossier n'est plus modifiable");
      Object.assign(item, input);
      await repo.save(item);
      await history(manager, item.id, actor, { action: "COMPLIANCE_UPDATED", afterValue: input });
      return item;
    }
    item = await repo.save(repo.create({ clubId, seasonId, federationId: affiliation.federationId, leagueId: affiliation.leagueId ?? null, status: "DRAFT", ...input }));
    await history(manager, item.id, actor, { action: "COMPLIANCE_CREATED", toStatus: "DRAFT", afterValue: input });
    return item;
  });
}

export async function submitFinancialCompliance(clubId: string, id: string, actor: FinancialComplianceActor): Promise<FinancialCompliance> {
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(FinancialCompliance);
    const item = await repo.createQueryBuilder("item").setLock("pessimistic_write").where("item.id = :id", { id }).andWhere("item.club_id = :clubId", { clubId }).getOne();
    if (!item) throw new FinancialComplianceWorkflowError("Dossier financier introuvable");
    assertFinancialComplianceTransition(item.status, "SUBMITTED");
    const previous = item.status;
    item.status = "SUBMITTED";
    item.submittedAt = new Date();
    await repo.save(item);
    await history(manager, id, actor, { action: "STATUS_SUBMITTED", fromStatus: previous, toStatus: "SUBMITTED" });
    await new NotificationOutboxService().enqueue(manager, { eventId: `financial-compliance:${id}:SUBMITTED:${item.submittedAt.toISOString()}`, type: "FINANCIAL_COMPLIANCE_SUBMITTED", target: { type: "ROLE", role: "FEDERATION_ADMIN" }, teamId: clubId, category: "REGULATORY", title: "Nouveau dossier financier", body: "Un club a soumis son dossier de conformité financière.", data: { complianceId: id, clubId, seasonId: item.seasonId } });
    return item;
  });
}
