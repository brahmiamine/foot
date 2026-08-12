import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { Match } from "@/entities/Match";
import { Team } from "@/entities/Team";

export async function seedTeam(dataSource: DataSource, overrides: Partial<Team> = {}): Promise<Team> {
  const repo = dataSource.getRepository(Team);
  return repo.save(
    repo.create({
      id: randomUUID(),
      nom: "Club Olympique de Béja",
      sport: "football",
      ageCategory: "senior",
      ...overrides,
    }),
  );
}

export async function seedMatch(
  dataSource: DataSource,
  overrides: Partial<Match> & { equipeHome: string; equipeAway: string },
): Promise<Match> {
  const repo = dataSource.getRepository(Match);
  return repo.save(
    repo.create({
      id: randomUUID(),
      status: "UPCOMING",
      isPublicVisible: true,
      date: null,
      ...overrides,
    }),
  );
}
