import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/db";
import { Team } from "@/entities/Team";

/**
 * GET /api/teams — liste publique des clubs pour l'écran de connexion.
 * Lecture seule : la gestion du référentiel reste dans federation-hub.
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
      nomAr: team.nomAr ?? null,
      logoUrl: team.logoUrl ?? null,
    }))
  );
}
