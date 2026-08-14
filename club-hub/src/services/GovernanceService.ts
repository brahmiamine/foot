import type { EntityManager } from "typeorm";
import { BoardMandate, BoardMandateHistory, BoardMember } from "@/entities/Governance";
import { TeamAffiliation } from "@/entities/TeamAffiliation";
import { getDataSource } from "@/lib/database";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import { assertBoardMandateTransition, canEditBoardMandate, GovernanceWorkflowError, type BoardMemberRole } from "../../../packages/regulatory-shared/src/governance";

export interface GovernanceActor { userId: string; role: string; ipAddress?: string | null; userAgent?: string | null; }
export interface BoardMandateInput { startsAt: string; endsAt: string; electionDocumentUrl?: string | null; }
export interface BoardMemberInput { personName: string; userId?: string | null; role: BoardMemberRole; startsAt: string; endsAt?: string | null; appointmentDocumentUrl?: string | null; }

async function history(manager: EntityManager, mandateId: string, actor: GovernanceActor, input: { action: string; fromStatus?: string | null; toStatus?: string | null; afterValue?: Record<string, unknown> | null }): Promise<void> {
  const repo = manager.getRepository(BoardMandateHistory);
  await repo.save(repo.create({ mandateId, action: input.action, fromStatus: input.fromStatus ?? null, toStatus: input.toStatus ?? null, actorUserId: actor.userId, actorRole: actor.role, afterValue: input.afterValue ?? null, ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent ?? null }));
}

async function owned(manager: EntityManager, clubId: string, mandateId: string, lock = false): Promise<BoardMandate> {
  let query = manager.getRepository(BoardMandate).createQueryBuilder("mandate").where("mandate.id = :mandateId", { mandateId }).andWhere("mandate.club_id = :clubId", { clubId });
  if (lock) query = query.setLock("pessimistic_write");
  const mandate = await query.getOne();
  if (!mandate) throw new GovernanceWorkflowError("Mandat introuvable");
  return mandate;
}

export async function listBoardMandatesForClub(clubId: string) {
  const dataSource = await getDataSource();
  return dataSource.getRepository(BoardMandate).find({ where: { clubId }, order: { createdAt: "DESC" } });
}

export async function getBoardMandateBundleForClub(clubId: string, mandateId: string) {
  const dataSource = await getDataSource();
  const mandate = await dataSource.getRepository(BoardMandate).findOne({ where: { id: mandateId, clubId } });
  if (!mandate) throw new GovernanceWorkflowError("Mandat introuvable");
  const [members, events] = await Promise.all([
    dataSource.getRepository(BoardMember).find({ where: { mandateId }, order: { role: "ASC" } }),
    dataSource.getRepository(BoardMandateHistory).find({ where: { mandateId }, order: { createdAt: "DESC" } }),
  ]);
  return { mandate, members, history: events };
}

export async function createBoardMandateForClub(clubId: string, input: BoardMandateInput, actor: GovernanceActor): Promise<BoardMandate> {
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const affiliation = await manager.getRepository(TeamAffiliation).findOne({ where: { teamId: clubId, status: "ACTIVE" } });
    if (!affiliation) throw new GovernanceWorkflowError("Aucune affiliation réglementaire active pour ce club");
    const repo = manager.getRepository(BoardMandate);
    const mandate = await repo.save(repo.create({ clubId, federationId: affiliation.federationId, leagueId: affiliation.leagueId ?? null, startsAt: input.startsAt, endsAt: input.endsAt, electionDocumentUrl: input.electionDocumentUrl ?? null, status: "DRAFT", createdBy: actor.userId }));
    await history(manager, mandate.id, actor, { action: "MANDATE_CREATED", toStatus: "DRAFT", afterValue: { startsAt: input.startsAt, endsAt: input.endsAt } });
    return mandate;
  });
}

export async function addBoardMember(clubId: string, mandateId: string, input: BoardMemberInput, actor: GovernanceActor): Promise<BoardMember> {
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const mandate = await owned(manager, clubId, mandateId);
    if (mandate.status === "ENDED" || mandate.status === "REJECTED") throw new GovernanceWorkflowError("Ce mandat n'accepte plus de nouveaux membres");
    const repo = manager.getRepository(BoardMember);
    const member = await repo.save(repo.create({ mandateId, personName: input.personName, userId: input.userId ?? null, role: input.role, startsAt: input.startsAt, endsAt: input.endsAt ?? null, appointmentDocumentUrl: input.appointmentDocumentUrl ?? null, federationApproved: false }));
    await history(manager, mandateId, actor, { action: "MEMBER_ADDED", afterValue: { memberId: member.id, personName: member.personName, role: member.role } });
    return member;
  });
}

export async function submitBoardMandate(clubId: string, mandateId: string, actor: GovernanceActor): Promise<BoardMandate> {
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const mandate = await owned(manager, clubId, mandateId, true);
    assertBoardMandateTransition(mandate.status, "SUBMITTED");
    const memberCount = await manager.getRepository(BoardMember).count({ where: { mandateId } });
    if (memberCount === 0) throw new GovernanceWorkflowError("Au moins un membre du comité directeur est requis");
    const previous = mandate.status;
    mandate.status = "SUBMITTED";
    mandate.submittedAt = new Date();
    await manager.getRepository(BoardMandate).save(mandate);
    await history(manager, mandateId, actor, { action: "STATUS_SUBMITTED", fromStatus: previous, toStatus: "SUBMITTED" });
    await new NotificationOutboxService().enqueue(manager, { eventId: `board-mandate:${mandateId}:SUBMITTED:${mandate.submittedAt.toISOString()}`, type: "BOARD_MANDATE_SUBMITTED", target: { type: "ROLE", role: "FEDERATION_ADMIN" }, teamId: clubId, category: "REGULATORY", title: "Nouveau mandat du comité directeur", body: "Un club a soumis son comité directeur pour validation.", data: { mandateId, clubId } });
    return mandate;
  });
}

export { canEditBoardMandate };
