import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Team } from "@/entities/Team";
import { handleApiError } from "@/lib/api";

/**
 * GET /api/teams?type=club — liste publique des clubs, pour le sélecteur
 * de club à l'inscription vendeur. Lecture seule : la gestion du
 * référentiel reste dans federation-hub/club-hub.
 */
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type");
    const ds = await getDataSource();
    const teams = await ds.getRepository(Team).find({
      where: type ? { teamType: type as "club" | "national" } : {},
      order: { nom: "ASC" },
    });

    return NextResponse.json({
      items: teams.map((team) => ({
        id: team.id,
        nom: team.nom,
        abbr: team.abbr ?? null,
        logoUrl: team.logoUrl ?? null,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
