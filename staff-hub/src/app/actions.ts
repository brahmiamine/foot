"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserAccess, can, requirePermission } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notificationApi";
import type { TrainingInvitationResponse } from "@/entities/TrainingInvitation";
import type { LineupRole } from "@/entities/MatchLineup";
import type { AgeCategory } from "@/types/categories";
import type { PlayerStat } from "@/entities/PlayerStat";

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

function requestIp(headersList: Headers): string | null {
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headersList.get("x-real-ip");
}

async function auditContext(access: Awaited<ReturnType<typeof getUserAccess>>, reason: string) {
  const requestHeaders = await headers();
  return {
    actorUserId: access.userId,
    actorRole: access.isClubAdmin ? "ADMIN" : "STAFF",
    reason,
    ipAddress: requestIp(requestHeaders),
    userAgent: requestHeaders.get("user-agent"),
  };
}

/** STAFF-005 — autorisé si permission directe `lineups.approve` ou délégation active de coach principal pour ce match. */
async function canApproveLineup(
  access: Awaited<ReturnType<typeof getUserAccess>>,
  teamId: string,
  matchId?: string,
  friendlyMatchId?: number,
): Promise<boolean> {
  if (can(access, "lineups.approve")) return true;
  return staffPortalService.isHeadCoachDelegated(teamId, access.userId, { matchId, friendlyMatchId });
}

export async function createFriendlyMatchAction(data: {
  category: AgeCategory;
  opponentName: string;
  isHome: boolean;
  venueName?: string;
  date: string;
}) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "friendlyMatches.create");
  await staffPortalService.createFriendlyMatch({ teamId: user.teamId, ...data, date: new Date(data.date) });
  revalidatePath("/matchs");
  revalidatePath("/");
}

export async function createTrainingAction(data: {
  category: AgeCategory;
  title: string;
  trainingType: string;
  date: string;
  durationMinutes?: number;
  venueName?: string;
}) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "trainings.create");
  await staffPortalService.createTraining({
    teamId: user.teamId,
    category: data.category,
    title: data.title,
    trainingType: data.trainingType as never,
    date: new Date(data.date),
    durationMinutes: data.durationMinutes,
    venueName: data.venueName,
    createdBy: user.id,
  });
  revalidatePath("/entrainements");
  revalidatePath("/calendrier");
  revalidatePath("/");
}

export async function submitTrainingPlanAction(id: number) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "trainings.edit");
  await staffPortalService.submitTrainingPlan(id, user.teamId, user.id);
  revalidatePath("/entrainements");
}

export async function approveTrainingPlanAction(id: number) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "trainings.edit");
  await staffPortalService.approveTrainingPlan(id, user.teamId, user.id);
  revalidatePath("/entrainements");
}

export async function cancelTrainingAction(id: number) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "trainings.edit");
  await staffPortalService.cancelTraining(id, user.teamId);
  revalidatePath("/entrainements");
  revalidatePath("/calendrier");
}

export async function inviteRosterToTrainingAction(trainingId: number) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "trainings.invite");
  const count = await staffPortalService.inviteRosterToTraining(trainingId, user.teamId);
  revalidatePath("/entrainements");
  return { count };
}

export async function setAttendanceAction(invitationId: number, response: TrainingInvitationResponse) {
  const access = await getUserAccess();
  requirePermission(access, "trainings.invite");
  await staffPortalService.setAttendance(invitationId, response);
  revalidatePath("/entrainements");
  revalidatePath("/presences");
}

export async function createConvocationsAction(
  matchType: "OFFICIAL" | "FRIENDLY",
  playerIds: string[],
  matchId?: string,
  friendlyMatchId?: number,
) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "convocations.send");
  const count = await staffPortalService.createConvocations(user.teamId, matchType, playerIds, matchId, friendlyMatchId);
  revalidatePath("/convocations");
  revalidatePath("/");
  return { count };
}

export async function setFormationAction(
  matchType: "OFFICIAL" | "FRIENDLY",
  formation: string,
  matchId?: string,
  friendlyMatchId?: number,
) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "lineups.edit");
  await staffPortalService.setFormation(user.teamId, matchType, formation, matchId, friendlyMatchId);
  revalidatePath("/composition");
}

export async function setLineupEntryAction(
  matchType: "OFFICIAL" | "FRIENDLY",
  playerId: string,
  role: LineupRole,
  options: { matchId?: string; friendlyMatchId?: number; shirtNumber?: number; isCaptain?: boolean },
) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "lineups.edit");
  await staffPortalService.setLineupEntry(user.teamId, matchType, playerId, role, options);
  revalidatePath("/composition");
}

export async function removeLineupEntryAction(id: number) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "lineups.edit");
  await staffPortalService.removeLineupEntry(id, user.teamId);
  revalidatePath("/composition");
}

export async function proposeLineupAction(
  matchType: "OFFICIAL" | "FRIENDLY",
  matchId?: string,
  friendlyMatchId?: number,
): Promise<void> {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "lineups.propose");
  await staffPortalService.proposeLineup(user.teamId, matchType, user.id, matchId, friendlyMatchId);
  revalidatePath("/composition");
}

export async function approveLineupAction(
  matchType: "OFFICIAL" | "FRIENDLY",
  matchId?: string,
  friendlyMatchId?: number,
): Promise<void> {
  const user = await requireSession();
  const access = await getUserAccess();
  if (!(await canApproveLineup(access, user.teamId, matchId, friendlyMatchId))) {
    throw new Error("Action non autorisée : permission manquante");
  }
  await staffPortalService.approveLineup(user.teamId, matchType, user.id, matchId, friendlyMatchId);
  revalidatePath("/composition");
}

export async function lockLineupAction(
  matchType: "OFFICIAL" | "FRIENDLY",
  matchId?: string,
  friendlyMatchId?: number,
): Promise<void> {
  const user = await requireSession();
  const access = await getUserAccess();
  if (!(await canApproveLineup(access, user.teamId, matchId, friendlyMatchId))) {
    throw new Error("Action non autorisée : permission manquante");
  }
  await staffPortalService.lockLineup(user.teamId, matchType, user.id, matchId, friendlyMatchId);
  revalidatePath("/composition");
}

export async function createStatAction(data: {
  playerId: string;
  season?: string;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "stats.manage");
  await staffPortalService.createStat({ teamId: user.teamId, createdBy: user.id, ...data });
  revalidatePath("/statistiques");
}

export async function updateStatAction(
  id: number,
  changes: Partial<
    Pick<PlayerStat, "season" | "minutesPlayed" | "goals" | "assists" | "yellowCards" | "redCards" | "injuriesCount" | "trainingsAttended" | "trainingsTotal">
  >,
  reason?: string,
) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "stats.manage");
  await staffPortalService.updateStat(id, user.teamId, user.id, changes, reason);
  revalidatePath("/statistiques");
}

export async function createTripAction(data: { category: AgeCategory; departureTime: string; meetingPoint?: string }) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "trips.manage");
  await staffPortalService.createTrip({ teamId: user.teamId, category: data.category, departureTime: new Date(data.departureTime), meetingPoint: data.meetingPoint });
  revalidatePath("/deplacements");
}

export async function addRosterToTripAction(tripId: number) {
  const user = await requireSession();
  const access = await getUserAccess();
  requirePermission(access, "trips.manage");
  const count = await staffPortalService.addRosterToTrip(tripId, user.teamId);
  revalidatePath("/deplacements");
  return { count };
}

export async function markNotificationReadAction(id: string) {
  await requireSession();
  await markNotificationRead(id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  await requireSession();
  await markAllNotificationsRead();
  revalidatePath("/notifications");
}

function requireStaffSettingsAccess(access: Awaited<ReturnType<typeof getUserAccess>>) {
  if (!access.isClubAdmin && !can(access, "staffSettings.manage")) {
    throw new Error("Action réservée à la configuration des politiques du staff");
  }
}

export async function updateLineupLockPolicyAction(input: { enabled: boolean; lockMinutesBeforeKickoff: number }, reason: string) {
  const user = await requireSession();
  const access = await getUserAccess();
  requireStaffSettingsAccess(access);
  await staffPortalService.updateLineupLockPolicy(user.teamId, input, await auditContext(access, reason));
  revalidatePath("/composition");
  revalidatePath("/parametres");
}

export async function updateTrainingApprovalPolicyAction(input: { approvalRequired: boolean }, reason: string) {
  const user = await requireSession();
  const access = await getUserAccess();
  requireStaffSettingsAccess(access);
  await staffPortalService.updateTrainingApprovalPolicy(user.teamId, input, await auditContext(access, reason));
  revalidatePath("/entrainements");
  revalidatePath("/parametres");
}

export async function updateStatReviewPolicyAction(input: { reviewWindowHours: number }, reason: string) {
  const user = await requireSession();
  const access = await getUserAccess();
  requireStaffSettingsAccess(access);
  await staffPortalService.updateStatReviewPolicy(user.teamId, input, await auditContext(access, reason));
  revalidatePath("/statistiques");
  revalidatePath("/parametres");
}

export async function grantHeadCoachDelegationAction(input: {
  delegateeUserId: string;
  delegateeStaffId: number;
  matchId?: string;
  friendlyMatchId?: number;
  validFrom?: string;
  validUntil?: string;
  reason: string;
}) {
  const user = await requireSession();
  const access = await getUserAccess();
  requireStaffSettingsAccess(access);
  await staffPortalService.grantHeadCoachDelegation(user.teamId, {
    delegatorUserId: user.id,
    delegateeUserId: input.delegateeUserId,
    delegateeStaffId: input.delegateeStaffId,
    matchId: input.matchId,
    friendlyMatchId: input.friendlyMatchId,
    validFrom: input.validFrom ? new Date(input.validFrom) : null,
    validUntil: input.validUntil ? new Date(input.validUntil) : null,
    reason: input.reason,
  });
  revalidatePath("/parametres");
}

export async function revokeHeadCoachDelegationAction(id: string, reason: string) {
  const user = await requireSession();
  const access = await getUserAccess();
  requireStaffSettingsAccess(access);
  await staffPortalService.revokeHeadCoachDelegation(id, user.teamId, user.id, reason);
  revalidatePath("/parametres");
}
