import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Team } from "@/entities/Team";

/**
 * GET /api/teams — liste publique en lecture seule des clubs, pour le
 * sélecteur de club à l'inscription vendeur. Le référentiel complet reste
 * géré dans superadmin.
 */
export async function GET() {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(Team);

  const teams = await repository.find({
    where: { teamType: "club" },
    order: { nom: "ASC" },
  });

  return NextResponse.json(
    teams.map((team) => ({
      id: team.id,
      nom: team.nom,
      abbr: team.abbr,
      logoUrl: team.logoUrl,
    }))
  );
}
