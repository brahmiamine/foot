import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { Match } from "@/entities/Match";
import { Matchday } from "@/entities/Matchday";
import { Player } from "@/entities/Player";
import { Sheet } from "@/entities/Sheet";
import { Team } from "@/entities/Team";

/** Graphe minimal requis pour un carton : deux équipes, une journée, un match, une feuille IN_PROGRESS, un joueur côté domicile. */
export async function seedBaseGraph(dataSource: DataSource) {
  const teamRepo = dataSource.getRepository(Team);
  const matchdayRepo = dataSource.getRepository(Matchday);
  const matchRepo = dataSource.getRepository(Match);
  const playerRepo = dataSource.getRepository(Player);
  const sheetRepo = dataSource.getRepository(Sheet);

  const teamDefaults = {
    teamType: "club" as const,
    sport: "football" as const,
    ageCategory: "seniors",
    gender: "male" as const,
  };

  const homeTeam = await teamRepo.save(teamRepo.create({ id: randomUUID(), nom: "Domicile FC", ...teamDefaults }));
  const awayTeam = await teamRepo.save(teamRepo.create({ id: randomUUID(), nom: "Visiteur FC", ...teamDefaults }));

  const matchday = await matchdayRepo.save(matchdayRepo.create({ id: randomUUID(), number: 1 }));

  const match = await matchRepo.save(
    matchRepo.create({
      id: randomUUID(),
      journeeId: matchday.id,
      equipeHome: homeTeam.id,
      equipeAway: awayTeam.id,
      date: new Date(),
      status: "IN_PROGRESS",
      illegalPlayerUsed: false,
      isPublicVisible: true,
    }),
  );

  const player = await playerRepo.save(
    playerRepo.create({
      id: randomUUID(),
      firstNameFr: "Ahmed",
      lastNameFr: "Ben Salah",
      number: 10,
      teamId: homeTeam.id,
      status: "TITULAR",
      isActive: true,
    }),
  );

  const sheet = await sheetRepo.save(sheetRepo.create({ matchId: match.id, status: "IN_PROGRESS" }));

  return { homeTeam, awayTeam, matchday, match, player, sheet };
}
