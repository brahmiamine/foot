import { NextResponse } from "next/server";
import { getSsoUserFromHeaders } from "@/lib/ssoUser";
import { PlatformNotificationService } from "@/services/PlatformNotificationService";

/**
 * POST /api/notifications/read-all
 * Marque toutes les notifications de l'utilisateur connecté comme lues.
 */
export async function POST() {
  try {
    const user = await getSsoUserFromHeaders();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const service = new PlatformNotificationService();
    await service.markAllRead(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour des notifications" }, { status: 500 });
  }
}
