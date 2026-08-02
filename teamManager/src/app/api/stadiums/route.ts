import { NextRequest, NextResponse } from "next/server";
import { StadiumService } from "@/services/StadiumService";
import { requireTeamId } from "@/lib/team-context";
import { createStadiumSchema } from "@/types/stadiums";

/**
 * GET /api/stadiums
 * Get all stadiums of the connected club
 */
export async function GET() {
  try {
    const teamId = await requireTeamId();
    const stadiumService = new StadiumService();
    const stadiums = await stadiumService.findAll(teamId);
    return NextResponse.json(stadiums);
  } catch (error) {
    console.error("Error fetching stadiums:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des stades" }, { status: 500 });
  }
}

/**
 * POST /api/stadiums
 * Create a new stadium
 */
export async function POST(request: NextRequest) {
  try {
    const teamId = await requireTeamId();
    const body = await request.json();
    const validatedData = createStadiumSchema.parse(body);

    const stadiumService = new StadiumService();
    const stadium = await stadiumService.create(validatedData, teamId);

    return NextResponse.json(stadium, { status: 201 });
  } catch (error) {
    console.error("Error creating stadium:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur lors de la création du stade" }, { status: 500 });
  }
}
