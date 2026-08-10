"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission, requireCategory } from "@/lib/access";
import { NotificationService } from "@/services/NotificationService";
import { AuditLogService } from "@/services/AuditLogService";
import { createNotificationSchema } from "@/types/notifications";

/**
 * Envoi d'une communication interne (message club -> équipe, coach ->
 * joueurs de sa catégorie, direction -> tous, annonce, urgence). Un rôle
 * scopé par catégorie (ex: Coach) ne peut jamais diffuser à tout le club
 * ni au staff entier : il doit préciser sa catégorie et cible uniquement
 * ses joueurs / son groupe équipe — c'est la restriction demandée pour
 * éviter que tout le monde puisse contacter tout le monde.
 */
export async function createNotification(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "notifications.send");

    const data = createNotificationSchema.parse({
      title: formData.get("title") as string,
      message: formData.get("message") as string,
      targetType: formData.get("targetType") as string,
      category: (formData.get("category") as string) || null,
      isUrgent: formData.get("isUrgent") === "on",
      matchId: (formData.get("matchId") as string) || undefined,
    });

    if (access.categories !== "ALL") {
      if (!data.category) {
        throw new Error("Une catégorie est requise : vous ne pouvez contacter que votre groupe équipe");
      }
      requireCategory(access, data.category);
      if (data.targetType === "ALL" || data.targetType === "STAFF") {
        throw new Error("Vous ne pouvez pas diffuser à tout le club ou au staff, seulement à votre catégorie");
      }
    }

    const teamId = await requireTeamId();
    const notificationService = new NotificationService();
    const notification = await notificationService.create(data, teamId, session.user.id);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "Notification",
      entityId: String(notification.id),
      after: notification,
    });

    revalidatePath("/admin/notifications");
    return { success: true, message: "Message envoyé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'envoi" };
  }
}

export async function deleteNotification(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "notifications.send");

    const teamId = await requireTeamId();
    const notificationService = new NotificationService();
    const existing = await notificationService.findById(id, teamId);
    if (!existing) throw new Error("Message non trouvé");
    if (existing.category) {
      requireCategory(access, existing.category);
    } else if (access.categories !== "ALL") {
      throw new Error("Action non autorisée : message hors de votre périmètre");
    }

    await notificationService.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "Notification",
      entityId: String(id),
    });

    revalidatePath("/admin/notifications");
    return { success: true, message: "Message supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
