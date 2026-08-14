"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { CardReasonService } from "@/services/CardReasonService";
import { AuditLogService } from "@/services/AuditLogService";

const createSchema = z.object({
  labelFr: z.string().min(2),
  labelAr: z.string().optional(),
  type: z.enum(["YELLOW", "RED", "BOTH"]).default("BOTH"),
  isActive: z.boolean().default(true),
});

const updateSchema = z.object({
  labelFr: z.string().min(2).optional(),
  labelAr: z.string().optional(),
  type: z.enum(["YELLOW", "RED", "BOTH"]).optional(),
  isActive: z.boolean().optional(),
});

/** Crée un motif de carton (commun à tous les clubs) — réservé ADMIN. */
export async function createCardReason(formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = createSchema.parse({
      labelFr: formData.get("labelFr") as string,
      labelAr: (formData.get("labelAr") as string) || undefined,
      type: (formData.get("type") as string) || undefined,
      isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    });

    const cardReasonService = new CardReasonService();
    const reason = await cardReasonService.create(data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "CardReason",
      entityId: reason.id,
      after: reason,
    });

    revalidatePath("/admin/settings/card-reasons");
    return { success: true, message: "Motif créé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

/** Met à jour un motif de carton — réservé ADMIN. */
export async function updateCardReason(id: string, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = updateSchema.parse({
      labelFr: (formData.get("labelFr") as string) || undefined,
      labelAr: (formData.get("labelAr") as string) || undefined,
      type: (formData.get("type") as string) || undefined,
      isActive: formData.has("isActive") ? formData.get("isActive") === "on" || formData.get("isActive") === "true" : undefined,
    });

    const cardReasonService = new CardReasonService();
    const before = await cardReasonService.findById(id);
    const reason = await cardReasonService.update(id, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "CardReason",
      entityId: id,
      before: before ?? undefined,
      after: reason,
    });

    revalidatePath("/admin/settings/card-reasons");
    return { success: true, message: "Motif modifié avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

/** Supprime un motif de carton — réservé ADMIN. */
export async function deleteCardReason(id: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const cardReasonService = new CardReasonService();
    const reason = await cardReasonService.findById(id);
    if (!reason) return { success: false, error: "Motif non trouvé" };
    await cardReasonService.delete(id);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "CardReason",
      entityId: id,
      before: reason,
    });

    revalidatePath("/admin/settings/card-reasons");
    return { success: true, message: "Motif supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
