"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getUserAccess, requirePermission } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notificationApi";
import type { TrainingInvitationResponse } from "@/entities/TrainingInvitation";
import type { LineupRole } from "@/entities/MatchLineup";
import type { AgeCategory } from "@/types/categories";

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session.user;
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
  });
  revalidatePath("/entrainements");
  revalidatePath("/calendrier");
  revalidatePath("/");
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
  requirePermission(access, "lineups.approve");
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
  requirePermission(access, "lineups.approve");
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
