"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { ConvocationService } from "@/services/ConvocationService";
import { AuditLogService } from "@/services/AuditLogService";
import { createConvocationSchema, updateConvocationResponseSchema } from "@/types/convocations";
import type { ConvocationResponse } from "@/entities/Convocation";

/** Convoque une liste de joueurs pour un match — réservé ADMIN. */
export async function createConvocation(formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = createConvocationSchema.parse({
      matchType: "OFFICIAL",
      matchId: formData.get("matchId") as string,
      playerIds: formData.getAll("playerIds") as string[],
      notes: (formData.get("notes") as string) || undefined,
    });

    const teamId = await requireTeamId();
    const convocationService = new ConvocationService();
    const convocations = await convocationService.createBulk(
      { ref: { matchType: "OFFICIAL", matchId: data.matchId }, playerIds: data.playerIds, notes: data.notes },
      teamId
    );

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "Convocation",
      entityId: String(data.matchId),
      after: { matchId: data.matchId, playerIds: data.playerIds, created: convocations.length },
    });

    revalidatePath("/admin/convocations");
    return {
      success: true,
      message:
        convocations.length > 0
          ? `${convocations.length} joueur(s) convoqué(s) avec succès`
          : "Ces joueurs étaient déjà convoqués pour ce match",
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la convocation" };
  }
}

/** Met à jour la réponse (présent/absent/en attente) d'une convocation — réservé ADMIN. */
export async function updateConvocationResponse(id: number, response: ConvocationResponse) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = updateConvocationResponseSchema.parse({ response });

    const teamId = await requireTeamId();
    const convocationService = new ConvocationService();
    const before = await convocationService.findById(id, teamId);
    const after = await convocationService.updateResponse(id, teamId, data.response);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Convocation",
      entityId: String(id),
      before: before ?? undefined,
      after,
    });

    revalidatePath("/admin/convocations");
    return { success: true, message: "Réponse mise à jour avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la mise à jour" };
  }
}

/** Supprime une convocation — réservé ADMIN. */
export async function deleteConvocation(id: number) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const convocationService = new ConvocationService();
    const before = await convocationService.findById(id, teamId);
    await convocationService.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "Convocation",
      entityId: String(id),
      before: before ?? undefined,
    });

    revalidatePath("/admin/convocations");
    return { success: true, message: "Convocation supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
