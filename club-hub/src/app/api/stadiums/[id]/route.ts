import { NextRequest, NextResponse } from "next/server";
import { StadiumService } from "@/services/StadiumService";
import { requireTeamId } from "@/lib/team-context";
import { updateStadiumSchema } from "@/types/stadiums";

/**
 * GET /api/stadiums/[id]
 * Get a stadium by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const stadiumId = parseInt(id, 10);

    if (isNaN(stadiumId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const teamId = await requireTeamId();
    const stadiumService = new StadiumService();
    const stadium = await stadiumService.findById(stadiumId, teamId);

    if (!stadium) {
      return NextResponse.json({ error: "Stade non trouvé" }, { status: 404 });
    }

    return NextResponse.json(stadium);
  } catch (error) {
    console.error("Error fetching stadium:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération du stade" }, { status: 500 });
  }
}

/**
 * PUT /api/stadiums/[id]
 * Update a stadium
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const stadiumId = parseInt(id, 10);

    if (isNaN(stadiumId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const teamId = await requireTeamId();
    const body = await request.json();
    const validatedData = updateStadiumSchema.parse(body);

    const stadiumService = new StadiumService();
    const stadium = await stadiumService.update(stadiumId, teamId, validatedData);

    return NextResponse.json(stadium);
  } catch (error) {
    console.error("Error updating stadium:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur lors de la mise à jour du stade" }, { status: 500 });
  }
}

/**
 * DELETE /api/stadiums/[id]
 * Delete a stadium
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const stadiumId = parseInt(id, 10);

    if (isNaN(stadiumId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const teamId = await requireTeamId();
    const stadiumService = new StadiumService();
    await stadiumService.delete(stadiumId, teamId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stadium:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur lors de la suppression du stade" }, { status: 500 });
  }
}
