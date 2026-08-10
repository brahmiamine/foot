import { NextResponse } from "next/server";
import { getSsoUserFromHeaders } from "@/lib/ssoUser";
import { PlatformNotificationService } from "@/services/PlatformNotificationService";

/**
 * GET /api/notifications/unread-count
 * Nombre de notifications non lues de l'utilisateur connecté (pour le badge de la cloche).
 */
export async function GET() {
  try {
    const user = await getSsoUserFromHeaders();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const service = new PlatformNotificationService();
    const count = await service.countUnread(user.id);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error counting unread notifications:", error);
    return NextResponse.json({ error: "Erreur lors du comptage des notifications" }, { status: 500 });
  }
}
