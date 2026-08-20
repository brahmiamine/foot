"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notificationApi";
import type { ConvocationResponse } from "@/entities/Convocation";
import type { TrainingRsvpStatus } from "@/entities/TrainingInvitation";
import type { TripTransportOffer } from "@/entities/TripParticipant";

async function requirePlayerId(): Promise<string> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  return session.user.playerId;
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
