"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission, requireCategory } from "@/lib/access";
import { TripService } from "@/services/TripService";
import { AuditLogService } from "@/services/AuditLogService";
import { createTripSchema, updateTripSchema, addTripParticipantSchema } from "@/types/trips";

function readTripForm(formData: FormData) {
  const departureStr = formData.get("departureTime") as string;
  const matchRef = (formData.get("matchRef") as string) || "";
  const [matchType, matchRefId] = matchRef ? matchRef.split(":") : [null, null];

  return {
    category: (formData.get("category") as string) || "seniors",
    matchType: matchType === "OFFICIAL" || matchType === "FRIENDLY" ? matchType : null,
    matchId: matchType === "OFFICIAL" ? matchRefId : null,
    friendlyMatchId: matchType === "FRIENDLY" && matchRefId ? parseInt(matchRefId, 10) : null,
    departureTime: departureStr ? new Date(departureStr) : new Date(),
    meetingPoint: (formData.get("meetingPoint") as string) || null,
    notes: (formData.get("notes") as string) || null,
    vehicles: JSON.parse((formData.get("vehiclesJson") as string) || "[]"),
  };
}

function revalidateTrips() {
  revalidatePath("/admin/trips");
  revalidatePath("/admin/trips/governance");
}

function assertTeamContext(accessTeamId: string, teamId: string) {
  if (accessTeamId !== teamId) throw new Error("Action non autorisée : contexte club incohérent");
}

export async function createTrip(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "trips.manage");

    const data = createTripSchema.parse(readTripForm(formData));
    requireCategory(access, data.category);

    const teamId = await requireTeamId();
    assertTeamContext(access.teamId, teamId);
    const service = new TripService();
    const trip = await service.create(data, teamId, session.user.id);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "CREATE", entity: "Trip", entityId: String(trip.id) });

    revalidateTrips();
    return { success: true, message: "Déplacement créé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateTrip(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "trips.manage");

    const teamId = await requireTeamId();
    assertTeamContext(access.teamId, teamId);
    const service = new TripService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Déplacement non trouvé");
    requireCategory(access, existing.category);

    const data = updateTripSchema.parse(readTripForm(formData));
    if (data.category) requireCategory(access, data.category);

    await service.update(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "UPDATE", entity: "Trip", entityId: String(id) });

    revalidateTrips();
    return { success: true, message: "Déplacement modifié avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteTrip(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "trips.manage");

    const teamId = await requireTeamId();
    assertTeamContext(access.teamId, teamId);
    const service = new TripService();
    const existing = await service.findById(id, teamId);
    if (!existing) throw new Error("Déplacement non trouvé");
    requireCategory(access, existing.category);

    await service.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "DELETE", entity: "Trip", entityId: String(id) });

    revalidateTrips();
    return { success: true, message: "Déplacement supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

export async function addTripParticipant(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "trips.manage");

    const data = addTripParticipantSchema.parse({
      tripId: formData.get("tripId") as string,
      participantType: (formData.get("participantType") as string) || "PLAYER",
      playerId: (formData.get("playerId") as string) || null,
      name: (formData.get("name") as string) || null,
      transportOffer: (formData.get("transportOffer") as string) || "NONE",
      offeredSeats: formData.get("offeredSeats") ? parseInt(formData.get("offeredSeats") as string, 10) : null,
    });

    const teamId = await requireTeamId();
    assertTeamContext(access.teamId, teamId);
    const service = new TripService();
    const trip = await service.findById(data.tripId, teamId);
    if (!trip) throw new Error("Déplacement non trouvé");
    requireCategory(access, trip.category);

    await service.addParticipant(data.tripId, teamId, data);

    revalidateTrips();
    return { success: true, message: "Participant ajouté avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'ajout" };
  }
}

export async function toggleTripParticipantConfirmed(participantId: number) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "trips.manage");

    const service = new TripService();
    const participant = await service.findParticipantById(participantId, access.teamId);
    if (!participant) throw new Error("Participant non trouvé");
    requireCategory(access, participant.trip.category);
    await service.toggleConfirmed(participantId, access.teamId);

    revalidateTrips();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur" };
  }
}

export async function removeTripParticipant(participantId: number) {
  try {
    const access = await getUserAccess();
    requirePermission(access, "trips.manage");

    const service = new TripService();
    const participant = await service.findParticipantById(participantId, access.teamId);
    if (!participant) throw new Error("Participant non trouvé");
    requireCategory(access, participant.trip.category);
    await service.removeParticipant(participantId, access.teamId);

    revalidateTrips();
    return { success: true, message: "Participant retiré" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du retrait" };
  }
}
