"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { CardService, DoubleYellowRequiredError } from "@/services/CardService";
import { AuditLogService } from "@/services/AuditLogService";

const createCardSchema = z.object({
  playerId: z.string().min(1),
  matchId: z.string().min(1),
  type: z.enum(["YELLOW", "RED", "DOUBLE_YELLOW"]),
  minute: z.number().int().min(1).max(999).optional(),
  cardReasonId: z.string().optional(),
  commentFr: z.string().optional(),
  commentAr: z.string().optional(),
  suspendedMatches: z.number().int().min(1).max(10).optional(),
});

/**
 * Créer un carton — réservé aux comptes ADMIN du club (même règle que
 * cardManager). Crée aussi l'amende associée et vérifie la suspension.
 */
export async function createCard(formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const minuteStr = formData.get("minute") as string;
    const suspendedMatchesStr = formData.get("suspendedMatches") as string;

    const data = createCardSchema.parse({
      playerId: formData.get("playerId") as string,
      matchId: formData.get("matchId") as string,
      type: formData.get("type") as string,
      minute: minuteStr ? parseInt(minuteStr, 10) : undefined,
      cardReasonId: (formData.get("cardReasonId") as string) || undefined,
      commentFr: (formData.get("commentFr") as string) || undefined,
      commentAr: (formData.get("commentAr") as string) || undefined,
      suspendedMatches: suspendedMatchesStr ? parseInt(suspendedMatchesStr, 10) : undefined,
    });

    const teamId = await requireTeamId();
    const cardService = new CardService();
    const card = await cardService.create(data, teamId, session.user.id);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "Card",
      entityId: card.id,
      after: card,
    });

    revalidatePath("/admin/cards");
    revalidatePath("/admin/suspensions");
    revalidatePath("/admin/fines");
    return { success: true, message: "Carton enregistré avec succès" };
  } catch (error) {
    if (error instanceof DoubleYellowRequiredError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}

/** Supprimer un carton — réservé aux comptes ADMIN du club. */
export async function deleteCard(id: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const cardService = new CardService();
    const card = await cardService.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "Card",
      entityId: id,
      before: card,
    });

    revalidatePath("/admin/cards");
    revalidatePath("/admin/suspensions");
    revalidatePath("/admin/fines");
    return { success: true, message: "Carton supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
