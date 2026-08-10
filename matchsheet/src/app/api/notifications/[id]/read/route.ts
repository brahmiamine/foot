import { NextRequest, NextResponse } from "next/server";
import { getSsoUserFromHeaders } from "@/lib/ssoUser";
import { PlatformNotificationService } from "@/services/PlatformNotificationService";

/**
 * POST /api/notifications/[id]/read
 * Marque une notification comme lue (scopée à l'utilisateur connecté).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSsoUserFromHeaders();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const notificationId = parseInt(id, 10);
    if (isNaN(notificationId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const service = new PlatformNotificationService();
    await service.markRead(notificationId, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la notification" }, { status: 500 });
  }
}
