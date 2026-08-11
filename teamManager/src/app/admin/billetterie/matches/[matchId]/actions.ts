"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { TicketingService } from "@/services/TicketingService";
import { AuditLogService } from "@/services/AuditLogService";
import { upsertMatchOfferSchema } from "@/types/ticketing";

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Crée ou met à jour l'offre (catégorie x match) et sa règle de vente — réservé ADMIN. */
export async function upsertMatchOffer(matchId: string, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = upsertMatchOfferSchema.parse({
      categoryId: formData.get("categoryId") as string,
      price: Number(formData.get("price")),
      capacity: Number(formData.get("capacity")),
      allowedAudience: (formData.get("allowedAudience") as string) || "PUBLIC",
      maxTicketsPerUser: Number(formData.get("maxTicketsPerUser") || 4),
      startsAt: (formData.get("startsAt") as string) || null,
      endsAt: (formData.get("endsAt") as string) || null,
    });

    const teamId = await requireTeamId();
    const service = new TicketingService();
    const match = await service.findHomeMatch(matchId, teamId);
    if (!match) {
      return { success: false, error: "Match introuvable pour ce club." };
    }
    const category = await service.findCategory(data.categoryId, teamId);
    if (!category) {
      return { success: false, error: "Catégorie introuvable pour ce club." };
    }

    const offer = await service.upsertOffer(matchId, data.categoryId, {
      price: data.price.toFixed(3),
      capacity: data.capacity,
      allowedAudience: data.allowedAudience,
      maxTicketsPerUser: data.maxTicketsPerUser,
      startsAt: parseDateInput(data.startsAt),
      endsAt: parseDateInput(data.endsAt),
    });

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "MatchTicketCategory",
      entityId: offer.id,
      after: offer,
    });

    revalidatePath(`/admin/billetterie/matches/${matchId}`);
    return { success: true, message: "Offre de billetterie enregistrée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}

/** Retire une catégorie de billet de la billetterie d'un match — réservé ADMIN. */
export async function deleteMatchOffer(matchId: string, offerId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const service = new TicketingService();
    const match = await service.findHomeMatch(matchId, teamId);
    if (!match) {
      return { success: false, error: "Match introuvable pour ce club." };
    }
    await service.deleteOffer(offerId, matchId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "MatchTicketCategory",
      entityId: offerId,
    });

    revalidatePath(`/admin/billetterie/matches/${matchId}`);
    return { success: true, message: "Offre retirée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
