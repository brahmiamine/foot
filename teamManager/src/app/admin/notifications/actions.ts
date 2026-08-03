"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { NotificationService } from "@/services/NotificationService";
import { AuditLogService } from "@/services/AuditLogService";
import { createNotificationSchema } from "@/types/notifications";

/** Crée et diffuse une notification (annonce) — réservé ADMIN. */
export async function createNotification(formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = createNotificationSchema.parse({
      title: formData.get("title") as string,
      message: formData.get("message") as string,
      targetType: formData.get("targetType") as string,
      matchId: (formData.get("matchId") as string) || undefined,
    });

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
    return { success: true, message: "Notification envoyée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'envoi" };
  }
}

/** Supprime une notification — réservé ADMIN. */
export async function deleteNotification(id: number) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const notificationService = new NotificationService();
    await notificationService.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "Notification",
      entityId: String(id),
    });

    revalidatePath("/admin/notifications");
    return { success: true, message: "Notification supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
