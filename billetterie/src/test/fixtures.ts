import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { Match } from "@/entities/Match";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { Team } from "@/entities/Team";
import { Ticket } from "@/entities/Ticket";
import { TicketCategory } from "@/entities/TicketCategory";

/** Équipe + match + catégorie de billet + ouverture de vente pour ce match — le graphe minimal requis pour un billet. */
export async function seedMatchWithCategory(
  dataSource: DataSource,
  overrides: { capacity?: number; soldCount?: number; price?: string } = {},
) {
  const teamRepo = dataSource.getRepository(Team);
  const matchRepo = dataSource.getRepository(Match);
  const categoryRepo = dataSource.getRepository(TicketCategory);
  const mtcRepo = dataSource.getRepository(MatchTicketCategory);

  const homeTeam = await teamRepo.save(teamRepo.create({ id: randomUUID(), nom: "Domicile FC" }));
  const awayTeam = await teamRepo.save(teamRepo.create({ id: randomUUID(), nom: "Visiteur FC" }));

  const match = await matchRepo.save(
    matchRepo.create({
      id: randomUUID(),
      equipeHome: homeTeam.id,
      equipeAway: awayTeam.id,
      date: new Date(),
      status: "UPCOMING",
      isPublicVisible: true,
    }),
  );

  const category = await categoryRepo.save(
    categoryRepo.create({
      id: randomUUID(),
      clubId: homeTeam.id,
      name: "Tribune",
      slug: "tribune",
      basePrice: "20.000",
      isActive: true,
    }),
  );

  const matchTicketCategory = await mtcRepo.save(
    mtcRepo.create({
      id: randomUUID(),
      matchId: match.id,
      categoryId: category.id,
      price: overrides.price ?? "20.000",
      capacity: overrides.capacity ?? 100,
      soldCount: overrides.soldCount ?? 0,
    }),
  );

  return { homeTeam, awayTeam, match, category, matchTicketCategory };
}

export async function seedTicket(
  dataSource: DataSource,
  matchTicketCategory: MatchTicketCategory,
  overrides: Partial<Ticket> = {},
) {
  const ticketRepo = dataSource.getRepository(Ticket);
  return ticketRepo.save(
    ticketRepo.create({
      id: randomUUID(),
      matchId: matchTicketCategory.matchId,
      matchTicketCategoryId: matchTicketCategory.id,
      organizerTeamId: overrides.organizerTeamId ?? randomUUID(),
      purchaserId: overrides.purchaserId ?? randomUUID(),
      status: overrides.status ?? "PENDING",
      reference: overrides.reference ?? `TK-${randomUUID().slice(0, 8)}`,
      price: overrides.price ?? "20.000",
      declaredAudience: overrides.declaredAudience ?? "PUBLIC",
      audienceMismatch: overrides.audienceMismatch ?? false,
      ...overrides,
    }),
  );
}
