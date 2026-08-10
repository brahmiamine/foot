import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PlatformNotificationService } from "@/services/PlatformNotificationService";

/**
 * GET /api/notifications/unread-count
 * Nombre de notifications non lues de l'utilisateur connecté (pour le badge de la cloche).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const service = new PlatformNotificationService();
    const count = await service.countUnread(session.user.id);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error counting unread notifications:", error);
    return NextResponse.json({ error: "Erreur lors du comptage des notifications" }, { status: 500 });
  }
}
