"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notificationApi";
import {
  submitSensitivePlayerProfileChanges,
  updateDirectPlayerProfile,
} from "@/lib/clubPlayerProfileClient";
import type { PlayerProfileChangeInput } from "@/services/player/profileChangePolicy";
import type { ConvocationResponse } from "@/entities/Convocation";
import type { TrainingRsvpStatus } from "@/entities/TrainingInvitation";
import type { TripTransportOffer } from "@/entities/TripParticipant";

async function requirePlayerSession(): Promise<{ playerId: string; userId: string }> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return { playerId: session.user.playerId, userId: session.user.id };
}

async function requirePlayerId(): Promise<string> {
  return (await requirePlayerSession()).playerId;
}

export async function updateProfileImageAction(imageUrl: string | null) {
  const { playerId, userId } = await requirePlayerSession();
  const result = await updateDirectPlayerProfile({ playerId, requesterUserId: userId, imageUrl });
  revalidatePath("/profil");
  return result;
}

export async function submitProfileChangeRequestAction(changes: PlayerProfileChangeInput) {
  const { playerId, userId } = await requirePlayerSession();
  const result = await submitSensitivePlayerProfileChanges({ playerId, requesterUserId: userId, changes });
  revalidatePath("/profil");
  return result;
}

export async function respondConvocationAction(
  convocationId: number,
  response: Exclude<ConvocationResponse, "PENDING">
) {
  const playerId = await requirePlayerId();
  const result = await playerPortalService.respondToConvocation(playerId, convocationId, response);
  revalidatePath("/");
  revalidatePath("/convocations");
  revalidatePath("/calendrier");
  return result;
}

export async function respondTrainingAction(
  invitationId: number,
  response: Exclude<TrainingRsvpStatus, "PENDING">
) {
  const playerId = await requirePlayerId();
  const result = await playerPortalService.respondToTraining(playerId, invitationId, response);
  revalidatePath("/");
  revalidatePath("/entrainements");
  revalidatePath("/calendrier");
  return result;
}

export async function respondTripAction(
  participantId: number,
  transportOffer: TripTransportOffer,
  offeredSeats: number | null
) {
  const playerId = await requirePlayerId();
  const result = await playerPortalService.respondToTrip(playerId, participantId, transportOffer, offeredSeats);
  revalidatePath("/deplacements");
  return result;
}

export async function markNotificationReadAction(id: string) {
  await requirePlayerId();
  await markNotificationRead(id);
  revalidatePath("/notifications");
  revalidatePath("/");
}

export async function markAllNotificationsReadAction() {
  await requirePlayerId();
  await markAllNotificationsRead();
  revalidatePath("/notifications");
  revalidatePath("/");
}
