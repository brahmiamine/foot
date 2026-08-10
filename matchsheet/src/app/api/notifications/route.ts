import { NextRequest, NextResponse } from "next/server";
import { getSsoUserFromHeaders } from "@/lib/ssoUser";
import { PlatformNotificationService } from "@/services/PlatformNotificationService";

/**
 * GET /api/notifications?unreadOnly=1&limit=30&offset=0
 * Liste les notifications de l'utilisateur connecté (les plus récentes d'abord).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSsoUserFromHeaders();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "1";
    const limit = Number(searchParams.get("limit") ?? 30);
    const offset = Number(searchParams.get("offset") ?? 0);

    const service = new PlatformNotificationService();
    const notifications = await service.list(user.id, { unreadOnly, limit, offset });
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des notifications" }, { status: 500 });
  }
}
