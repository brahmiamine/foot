import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { TicketCategory } from "@/entities/TicketCategory";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { Ticket } from "@/entities/Ticket";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { generateTicketReference } from "@/lib/reference";

export interface OpenMatchSummary {
  id: string;
  date: Date | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  stadium: string | null;
}

// Liste publique des matchs pour lesquels au moins une catégorie de billet
// a été ouverte (tk_match_ticket_categories) — pas de duplication de
// `matches`, c'est la table partagée qui reste la source de vérité pour le
// match lui-même (voir README racine § « Billetterie »).
export async function listOpenMatches(): Promise<OpenMatchSummary[]> {
  const ds = await getDataSource();

  const openRows = await ds.getRepository(MatchTicketCategory).find({ select: { matchId: true } });
  const matchIds = Array.from(new Set(openRows.map((r) => r.matchId)));
  if (matchIds.length === 0) return [];

  const matches = await ds.getRepository(Match).find({
    where: { id: In(matchIds), isPublicVisible: true, status: In(["UPCOMING", "IN_PROGRESS"]) },
    relations: ["homeTeam", "awayTeam"],
    order: { date: "ASC" },
  });

  return matches.map((m) => ({
    id: m.id,
    date: m.date ?? null,
    homeTeamName: m.homeTeam?.nom ?? "Équipe à domicile",
    awayTeamName: m.awayTeam?.nom ?? "Équipe visiteuse",
    homeTeamLogo: m.homeTeam?.logoUrl ?? null,
    awayTeamLogo: m.awayTeam?.logoUrl ?? null,
    stadium: m.homeTeam?.stadium ?? null,
  }));
}

export interface CategoryOffer {
  matchTicketCategoryId: string;
  categoryName: string;
  price: string;
  capacity: number;
  remaining: number;
  allowedAudience: "PUBLIC" | "HOME_SUPPORTERS" | "AWAY_SUPPORTERS";
  maxTicketsPerUser: number;
  saleOpen: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface MatchDetail {
  id: string;
  date: Date | null;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  stadium: string | null;
  offers: CategoryOffer[];
}

export async function getMatchDetail(matchId: string): Promise<MatchDetail | null> {
  const ds = await getDataSource();
  const match = await ds.getRepository(Match).findOne({ where: { id: matchId }, relations: ["homeTeam", "awayTeam"] });
  if (!match || !match.isPublicVisible) return null;

  const mtcs = await ds.getRepository(MatchTicketCategory).find({ where: { matchId } });

  let offers: CategoryOffer[] = [];
  if (mtcs.length > 0) {
    const categoryIds = Array.from(new Set(mtcs.map((m) => m.categoryId)));
    const categories = await ds.getRepository(TicketCategory).find({ where: { id: In(categoryIds) } });
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const mtcIds = mtcs.map((m) => m.id);
    const rules = await ds.getRepository(TicketSaleRule).find({ where: { matchTicketCategoryId: In(mtcIds) } });
    const ruleByMtc = new Map(rules.map((r) => [r.matchTicketCategoryId, r]));

    const now = new Date();
    offers = mtcs
      .filter((m) => categoryById.get(m.categoryId)?.isActive)
      .map((m) => {
        const category = categoryById.get(m.categoryId)!;
        const rule = ruleByMtc.get(m.id);
        const saleOpen = !rule || ((!rule.startsAt || rule.startsAt <= now) && (!rule.endsAt || rule.endsAt >= now));
        return {
          matchTicketCategoryId: m.id,
          categoryName: category.name,
          price: m.price,
          capacity: m.capacity,
          remaining: Math.max(0, m.capacity - m.soldCount),
          allowedAudience: rule?.allowedAudience ?? "PUBLIC",
          maxTicketsPerUser: rule?.maxTicketsPerUser ?? 4,
          saleOpen,
          startsAt: rule?.startsAt ?? null,
          endsAt: rule?.endsAt ?? null,
        };
      });
  }

  return {
    id: match.id,
    date: match.date ?? null,
    homeTeamId: match.equipeHome,
    awayTeamId: match.equipeAway,
    homeTeamName: match.homeTeam?.nom ?? "Équipe à domicile",
    awayTeamName: match.awayTeam?.nom ?? "Équipe visiteuse",
    homeTeamLogo: match.homeTeam?.logoUrl ?? null,
    awayTeamLogo: match.awayTeam?.logoUrl ?? null,
    stadium: match.homeTeam?.stadium ?? null,
    offers,
  };
}

export interface PurchaseInput {
  purchaserId: string;
  matchTicketCategoryId: string;
  quantity: number;
  // Auto-déclaration de l'acheteur pour les catégories réservées à un camp
  // (HOME_SUPPORTERS/AWAY_SUPPORTERS) — voir la note de sécurité dans
  // src/entities/TicketSaleRule.ts : ce n'est PAS une vérification
  // d'identité fiable, juste un garde-fou d'usage pour cette V1 mock.
  audienceConfirmed: boolean;
}

// Achat mock : pas d'intégration payment-api dans cette itération, le
// billet est marqué PAID immédiatement (voir NEXT_STEPS.md § B). Toute la
// validation (fenêtre de vente, quota, capacité) reste réelle et faite
// serveur — jamais fait confiance à une valeur envoyée par le client au-delà
// de l'id de catégorie et de la quantité désirée.
export async function purchaseTickets(input: PurchaseInput): Promise<Ticket[]> {
  if (input.quantity < 1) {
    throw new ForbiddenError("La quantité doit être d'au moins 1 billet.");
  }

  const ds = await getDataSource();

  return ds.transaction(async (manager) => {
    const mtc = await manager.findOne(MatchTicketCategory, {
      where: { id: input.matchTicketCategoryId },
      lock: { mode: "pessimistic_write" },
    });
    if (!mtc) throw new NotFoundError("Catégorie de billet introuvable.");

    const match = await manager.findOne(Match, { where: { id: mtc.matchId } });
    if (!match || !match.isPublicVisible) throw new NotFoundError("Match introuvable.");

    const category = await manager.findOne(TicketCategory, { where: { id: mtc.categoryId } });
    if (!category || !category.isActive) throw new NotFoundError("Catégorie de billet introuvable.");

    const rule = await manager.findOne(TicketSaleRule, { where: { matchTicketCategoryId: mtc.id } });
    const now = new Date();
    if (rule?.startsAt && rule.startsAt > now) {
      throw new ForbiddenError("La vente n'est pas encore ouverte pour cette catégorie.");
    }
    if (rule?.endsAt && rule.endsAt < now) {
      throw new ForbiddenError("La vente est terminée pour cette catégorie.");
    }

    const allowedAudience = rule?.allowedAudience ?? "PUBLIC";
    if (allowedAudience !== "PUBLIC" && !input.audienceConfirmed) {
      throw new ForbiddenError(
        allowedAudience === "HOME_SUPPORTERS"
          ? "Cette catégorie est réservée aux supporters du club recevant : merci de confirmer votre statut avant l'achat."
          : "Cette catégorie est réservée aux supporters du club visiteur : merci de confirmer votre statut avant l'achat.",
      );
    }

    const maxTicketsPerUser = rule?.maxTicketsPerUser ?? 4;
    const alreadyOwned = await manager.count(Ticket, {
      where: { matchTicketCategoryId: mtc.id, purchaserId: input.purchaserId, status: In(["PENDING", "PAID"]) },
    });
    if (alreadyOwned + input.quantity > maxTicketsPerUser) {
      throw new ForbiddenError(`Limite de ${maxTicketsPerUser} billet(s) par personne pour cette catégorie.`);
    }

    const remaining = mtc.capacity - mtc.soldCount;
    if (input.quantity > remaining) {
      throw new ConflictError(`Il ne reste que ${Math.max(0, remaining)} billet(s) disponible(s) pour cette catégorie.`);
    }

    mtc.soldCount += input.quantity;
    await manager.save(mtc);

    const paidAt = new Date();
    const tickets = Array.from({ length: input.quantity }, () =>
      manager.create(Ticket, {
        matchId: match.id,
        matchTicketCategoryId: mtc.id,
        organizerTeamId: match.equipeHome,
        purchaserId: input.purchaserId,
        status: "PAID",
        reference: generateTicketReference(),
        price: mtc.price,
        paidAt,
      }),
    );
    return manager.save(tickets);
  });
}

export interface MyTicket {
  id: string;
  reference: string;
  status: Ticket["status"];
  price: string;
  createdAt: Date;
  paidAt: Date | null;
  matchId: string;
  matchDate: Date | null;
  homeTeamName: string;
  awayTeamName: string;
  categoryName: string;
}

export async function listMyTickets(purchaserId: string): Promise<MyTicket[]> {
  const ds = await getDataSource();
  const tickets = await ds.getRepository(Ticket).find({ where: { purchaserId }, order: { createdAt: "DESC" } });
  if (tickets.length === 0) return [];

  const mtcIds = Array.from(new Set(tickets.map((t) => t.matchTicketCategoryId)));
  const mtcs = await ds.getRepository(MatchTicketCategory).find({ where: { id: In(mtcIds) } });
  const mtcById = new Map(mtcs.map((m) => [m.id, m]));

  const categoryIds = Array.from(new Set(mtcs.map((m) => m.categoryId)));
  const categories = await ds.getRepository(TicketCategory).find({ where: { id: In(categoryIds) } });
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const matchIds = Array.from(new Set(tickets.map((t) => t.matchId)));
  const matches = await ds.getRepository(Match).find({ where: { id: In(matchIds) }, relations: ["homeTeam", "awayTeam"] });
  const matchById = new Map(matches.map((m) => [m.id, m]));

  return tickets.map((t) => {
    const mtc = mtcById.get(t.matchTicketCategoryId);
    const category = mtc ? categoryById.get(mtc.categoryId) : undefined;
    const match = matchById.get(t.matchId);
    return {
      id: t.id,
      reference: t.reference,
      status: t.status,
      price: t.price,
      createdAt: t.createdAt,
      paidAt: t.paidAt,
      matchId: t.matchId,
      matchDate: match?.date ?? null,
      homeTeamName: match?.homeTeam?.nom ?? "Équipe à domicile",
      awayTeamName: match?.awayTeam?.nom ?? "Équipe visiteuse",
      categoryName: category?.name ?? "Catégorie",
    };
  });
}
