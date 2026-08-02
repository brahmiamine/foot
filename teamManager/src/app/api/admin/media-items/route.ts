import { NextResponse } from "next/server";
import { MediaItemService } from "@/services/MediaItemService";
import { requireTeamId } from "@/lib/team-context";

/**
 * GET /api/admin/media-items
 * Get all media items for admin use (selection in forms)
 */
export async function GET() {
  try {
    const teamId = await requireTeamId();
    const mediaItemService = new MediaItemService();
    const items = await mediaItemService.findAll(teamId);

    // Return simplified data
    const data = items.map((item) => ({
      id: item.id,
      url: item.url,
      type: item.type,
      mimeType: item.mimeType,
      altTextFr: item.altTextFr,
      altTextAr: item.altTextAr,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching media items:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la récupération des médias" },
      { status: 500 }
    );
  }
}

