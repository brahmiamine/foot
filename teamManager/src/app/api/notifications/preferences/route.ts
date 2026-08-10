import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PlatformNotificationService } from "@/services/PlatformNotificationService";

/**
 * GET /api/notifications/preferences
 * Préférence de notification email de l'utilisateur connecté.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const service = new PlatformNotificationService();
    const preference = await service.getPreference(session.user.id);
    return NextResponse.json(preference);
  } catch (error) {
    console.error("Error fetching notification preference:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des préférences" }, { status: 500 });
  }
}

/**
 * PUT /api/notifications/preferences
 * Met à jour la préférence de notification email de l'utilisateur connecté.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const emailEnabled = Boolean(body?.emailEnabled);

    const service = new PlatformNotificationService();
    await service.setPreference(session.user.id, emailEnabled);
    return NextResponse.json({ success: true, emailEnabled });
  } catch (error) {
    console.error("Error updating notification preference:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour des préférences" }, { status: 500 });
  }
}
