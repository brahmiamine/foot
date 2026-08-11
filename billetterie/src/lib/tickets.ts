import { randomBytes } from "node:crypto";
import { getDataSource } from "./database";
import { Match } from "@/entities/Match";
import { Team } from "@/entities/Team";
import { TicketCategory } from "@/entities/TicketCategory";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketSaleRule, TicketSaleAudience } from "@/entities/TicketSaleRule";
import { MemberTeamAffiliation } from "@/entities/MemberTeamAffiliation";
import { Ticket, TicketStatus } from "@/entities/Ticket";

export interface UpcomingMatchSummary {
  matchId: string;
  date: Date | null;
  homeTeam: { id: string; nom: string; logoUrl: string | null };
  awayTeam: { id: string; nom: string; logoUrl: string | null };
  categoriesCount: number;
}

/**
 * Matchs à venir, publics, pour lesquels au moins une catégorie de billet a
 * été configurée (voir tk_match_ticket_categories). Le club organisateur
 * (equipe_home) décide s'il ouvre la billetterie d'un match, pas cette app.
 */
export async function listUpcomingMatchesWithTickets(): Promise<UpcomingMatchSummary[]> {
  const ds = await getDataSource();

  const matchIds = await ds
    .getRepository(MatchTicketCategory)
    .createQueryBuilder("mtc")
    .select("DISTINCT mtc.matchId", "matchId")
    .getRawMany<{ matchId: string }>();

  if (matchIds.length === 0) return [];

  const matches = await ds
    .getRepository(Match)
    .createQueryBuilder("match")
    .where("match.id IN (:...ids)", { ids: matchIds.map((m) => m.matchId) })
    .andWhere("match.status = :status", { status: "UPCOMING" })
    .andWhere("match.isPublicVisible = 1")
    .orderBy("match.date", "ASC")
    .getMany();

  if (matches.length === 0) return [];

  const teamIds = Array.from(new Set(matches.flatMap((m) => [m.equipeHome, m.equipeAway])));
  const teams = await ds.getRepository(Team).createQueryBuilder("team").where("team.id IN (:...ids)", { ids: teamIds }).getMany();
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const counts = await ds
    .getRepository(MatchTicketCategory)
    .createQueryBuilder("mtc")
    .select("mtc.matchId", "matchId")
    .addSelect("COUNT(*)", "count")
    .where("mtc.matchId IN (:...ids)", { ids: matches.map((m) => m.id) })
    .groupBy("mtc.matchId")
    .getRawMany<{ matchId: string; count: string }>();
  const countByMatch = new Map(counts.map((c) => [c.matchId, parseInt(c.count, 10)]));

  return matches.map((match) => {
    const home = teamById.get(match.equipeHome);
    const away = teamById.get(match.equipeAway);
    return {
      matchId: match.id,
      date: match.date ?? null,
      homeTeam: { id: match.equipeHome, nom: home?.nom ?? "Club", logoUrl: home?.logoUrl ?? null },
      awayTeam: { id: match.equipeAway, nom: away?.nom ?? "Club", logoUrl: away?.logoUrl ?? null },
      categoriesCount: countByMatch.get(match.id) ?? 0,
    };
  });
}

export interface CategoryOffer {
  matchTicketCategoryId: string;
  name: string;
  description: string | null;
  price: string;
  available: number;
  capacity: number;
  saleRule: {
    allowedAudience: TicketSaleAudience;
    maxTicketsPerUser: number;
    startsAt: Date | null;
    endsAt: Date | null;
  } | null;
}

export interface MatchTicketingDetail {
  matchId: string;
  date: Date | null;
  homeTeam: { id: string; nom: string; logoUrl: string | null };
  awayTeam: { id: string; nom: string; logoUrl: string | null };
  organizerTeamId: string;
  categories: CategoryOffer[];
}

export async function getMatchTicketingDetail(matchId: string): Promise<MatchTicketingDetail | null> {
  const ds = await getDataSource();

  const match = await ds.getRepository(Match).findOne({ where: { id: matchId } });
  if (!match || match.status !== "UPCOMING" || !match.isPublicVisible) return null;

  const [home, away] = await Promise.all([
    ds.getRepository(Team).findOne({ where: { id: match.equipeHome } }),
    ds.getRepository(Team).findOne({ where: { id: match.equipeAway } }),
  ]);

  const offers = await ds.getRepository(MatchTicketCategory).find({ where: { matchId } });
  if (offers.length === 0) return null;

  const categoryIds = offers.map((o) => o.categoryId);
  const categories = await ds
    .getRepository(TicketCategory)
    .createQueryBuilder("category")
    .where("category.id IN (:...ids)", { ids: categoryIds })
    .andWhere("category.isActive = 1")
    .getMany();
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const rules = await ds
    .getRepository(TicketSaleRule)
    .createQueryBuilder("rule")
    .where("rule.matchTicketCategoryId IN (:...ids)", { ids: offers.map((o) => o.id) })
    .getMany();
  const ruleByOfferId = new Map(rules.map((r) => [r.matchTicketCategoryId, r]));

  const result: CategoryOffer[] = offers
    .filter((offer) => categoryById.has(offer.categoryId))
    .map((offer) => {
      const category = categoryById.get(offer.categoryId)!;
      const rule = ruleByOfferId.get(offer.id) ?? null;
      return {
        matchTicketCategoryId: offer.id,
        name: category.name,
        description: category.description,
        price: offer.price,
        available: Math.max(0, offer.capacity - offer.soldCount),
        capacity: offer.capacity,
        saleRule: rule
          ? {
              allowedAudience: rule.allowedAudience,
              maxTicketsPerUser: rule.maxTicketsPerUser,
              startsAt: rule.startsAt,
              endsAt: rule.endsAt,
            }
          : null,
      };
    });

  return {
    matchId: match.id,
    date: match.date ?? null,
    homeTeam: { id: match.equipeHome, nom: home?.nom ?? "Club", logoUrl: home?.logoUrl ?? null },
    awayTeam: { id: match.equipeAway, nom: away?.nom ?? "Club", logoUrl: away?.logoUrl ?? null },
    organizerTeamId: match.equipeHome,
    categories: result,
  };
}

function generateReference(): string {
  return `TK-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export type PurchaseResult =
  | { ok: true; ticket: Ticket }
  | { ok: false; error: "match_closed" | "category_not_found" | "sold_out" | "not_yet_open" | "sale_closed" | "not_eligible" | "quota_reached" };

/**
 * Achat d'un billet. Règle de sécurité : matchTicketCategoryId est résolu
 * et re-vérifié entièrement côté serveur (jamais de confiance dans un prix/
 * quota envoyé par le frontend) — voir README racine, section
 * « Billetterie ». Pas d'intégration paiement réelle dans cette itération :
 * le billet est marqué PAID directement (voir Ticket.ts pour le point
 * d'extension vers payment-api).
 */
export async function purchaseTicket(purchaserId: string, matchTicketCategoryId: string): Promise<PurchaseResult> {
  const ds = await getDataSource();

  return ds.transaction(async (manager) => {
    // FOR UPDATE : empêche deux achats concurrents de dépasser la capacité.
    const offer = await manager
      .getRepository(MatchTicketCategory)
      .createQueryBuilder("mtc")
      .setLock("pessimistic_write")
      .where("mtc.id = :id", { id: matchTicketCategoryId })
      .getOne();
    if (!offer) return { ok: false, error: "category_not_found" };

    const match = await manager.getRepository(Match).findOne({ where: { id: offer.matchId } });
    if (!match || match.status !== "UPCOMING" || !match.isPublicVisible) {
      return { ok: false, error: "match_closed" };
    }

    const rule = await manager.getRepository(TicketSaleRule).findOne({ where: { matchTicketCategoryId } });

    if (rule) {
      const now = new Date();
      if (rule.startsAt && now < rule.startsAt) return { ok: false, error: "not_yet_open" };
      if (rule.endsAt && now > rule.endsAt) return { ok: false, error: "sale_closed" };

      if (rule.allowedAudience !== TicketSaleAudience.PUBLIC) {
        const targetTeamId = rule.allowedAudience === TicketSaleAudience.HOME_SUPPORTERS ? match.equipeHome : match.equipeAway;
        const affiliation = await manager
          .getRepository(MemberTeamAffiliation)
          .findOne({ where: { userId: purchaserId, teamId: targetTeamId } });
        if (!affiliation) return { ok: false, error: "not_eligible" };
      }

      const existingForUser = await manager
        .getRepository(Ticket)
        .count({ where: { purchaserId, matchTicketCategoryId, status: TicketStatus.PAID } });
      if (existingForUser >= rule.maxTicketsPerUser) return { ok: false, error: "quota_reached" };
    }

    if (offer.soldCount >= offer.capacity) return { ok: false, error: "sold_out" };

    offer.soldCount += 1;
    await manager.save(offer);

    const ticket = manager.create(Ticket, {
      matchId: match.id,
      matchTicketCategoryId: offer.id,
      organizerTeamId: match.equipeHome,
      purchaserId,
      status: TicketStatus.PAID,
      reference: generateReference(),
      price: offer.price,
      paidAt: new Date(),
    });
    await manager.save(ticket);

    return { ok: true, ticket };
  });
}

export interface MyTicket {
  id: string;
  reference: string;
  status: TicketStatus;
  price: string;
  createdAt: Date;
  matchDate: Date | null;
  homeTeam: string;
  awayTeam: string;
  categoryName: string;
}

export async function listMyTickets(purchaserId: string): Promise<MyTicket[]> {
  const ds = await getDataSource();
  const tickets = await ds.getRepository(Ticket).find({ where: { purchaserId }, order: { createdAt: "DESC" } });
  if (tickets.length === 0) return [];

  const matchIds = Array.from(new Set(tickets.map((t) => t.matchId)));
  const offerIds = Array.from(new Set(tickets.map((t) => t.matchTicketCategoryId)));

  const [matches, offers] = await Promise.all([
    ds.getRepository(Match).createQueryBuilder("m").where("m.id IN (:...ids)", { ids: matchIds }).getMany(),
    ds.getRepository(MatchTicketCategory).createQueryBuilder("o").where("o.id IN (:...ids)", { ids: offerIds }).getMany(),
  ]);
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const offerById = new Map(offers.map((o) => [o.id, o]));

  const teamIds = Array.from(new Set(matches.flatMap((m) => [m.equipeHome, m.equipeAway])));
  const teams = await ds.getRepository(Team).createQueryBuilder("t").where("t.id IN (:...ids)", { ids: teamIds }).getMany();
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const categoryIds = Array.from(new Set(offers.map((o) => o.categoryId)));
  const categories = await ds.getRepository(TicketCategory).createQueryBuilder("c").where("c.id IN (:...ids)", { ids: categoryIds }).getMany();
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return tickets.map((ticket) => {
    const match = matchById.get(ticket.matchId);
    const offer = offerById.get(ticket.matchTicketCategoryId);
    const category = offer ? categoryById.get(offer.categoryId) : undefined;
    return {
      id: ticket.id,
      reference: ticket.reference,
      status: ticket.status,
      price: ticket.price,
      createdAt: ticket.createdAt,
      matchDate: match?.date ?? null,
      homeTeam: (match && teamById.get(match.equipeHome)?.nom) ?? "Club",
      awayTeam: (match && teamById.get(match.equipeAway)?.nom) ?? "Club",
      categoryName: category?.name ?? "Billet",
    };
  });
}
