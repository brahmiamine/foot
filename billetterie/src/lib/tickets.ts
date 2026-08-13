import { EntityManager, In, IsNull, LessThan, Not } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { TicketCategory } from "@/entities/TicketCategory";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketSaleRule } from "@/entities/TicketSaleRule";
import { Ticket } from "@/entities/Ticket";
import { TicketScanLog } from "@/entities/TicketScanLog";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { generateTicketReference } from "@/lib/reference";
import { getPaymentProvider, getPaymentStatus, initPayment } from "@/lib/paymentApiClient";
import { fetchMemberAffiliatedTeamIds, fetchMemberProfile } from "@/lib/ssoProfileClient";
import { verifyTicketToken } from "@/lib/ticketQr";

export interface OpenMatchSummary {
  id: string;
  date: Date | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamNameAr: string | null;
  awayTeamNameAr: string | null;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  stadium: string | null;
  stadiumAr: string | null;
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
    homeTeamNameAr: m.homeTeam?.nomAr ?? null,
    awayTeamNameAr: m.awayTeam?.nomAr ?? null,
    homeTeamLogo: m.homeTeam?.logoUrl ?? null,
    awayTeamLogo: m.awayTeam?.logoUrl ?? null,
    stadium: m.homeTeam?.stadium ?? null,
    stadiumAr: m.homeTeam?.stadiumAr ?? null,
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
  homeTeamNameAr: string | null;
  awayTeamNameAr: string | null;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  stadium: string | null;
  stadiumAr: string | null;
  offers: CategoryOffer[];
}

export async function getMatchDetail(matchId: string): Promise<MatchDetail | null> {
  const ds = await getDataSource();
  const match = await ds.getRepository(Match).findOne({ where: { id: matchId }, relations: ["homeTeam", "awayTeam"] });
  if (!match || !match.isPublicVisible || match.status === "CANCELLED") return null;

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
    homeTeamNameAr: match.homeTeam?.nomAr ?? null,
    awayTeamNameAr: match.awayTeam?.nomAr ?? null,
    homeTeamLogo: match.homeTeam?.logoUrl ?? null,
    awayTeamLogo: match.awayTeam?.logoUrl ?? null,
    stadium: match.homeTeam?.stadium ?? null,
    stadiumAr: match.homeTeam?.stadiumAr ?? null,
    offers,
  };
}

export interface PurchaseInput {
  purchaserId: string;
  purchaserEmail?: string;
  matchTicketCategoryId: string;
  quantity: number;
  // Auto-déclaration de l'acheteur pour les catégories réservées à un camp
  // (HOME_SUPPORTERS/AWAY_SUPPORTERS) — voir la note de sécurité dans
  // src/entities/TicketSaleRule.ts : ce n'est PAS une vérification
  // d'identité fiable, juste un garde-fou d'usage.
  audienceConfirmed: boolean;
}

export interface PurchaseResult {
  tickets: Ticket[];
  /** Le caller doit rediriger le navigateur du supporter vers cette URL. */
  payUrl: string;
}

// Une réservation PENDING sans paiement confirmé passé ce délai est
// considérée abandonnée et sa capacité libérée (voir releaseTickets et
// purgeStalePendingTickets ci-dessous) — sans ça, un panier jamais payé
// bloquerait des places indéfiniment. purchaseTickets applique un
// rattrapage opportuniste limité à la catégorie achetée ;
// purgeStalePendingTickets couvre toutes les catégories, pour un
// ordonnanceur externe (voir POST /api/cron/purge-pending-reservations).
const PENDING_RESERVATION_TTL_MS = 30 * 60 * 1000;

async function releaseTickets(manager: EntityManager, ticketIds: string[]): Promise<void> {
  if (ticketIds.length === 0) return;
  const tickets = await manager.find(Ticket, { where: { id: In(ticketIds) } });
  const mtcId = tickets[0]?.matchTicketCategoryId;

  for (const ticket of tickets) ticket.status = "CANCELLED";
  await manager.save(tickets);

  if (mtcId) {
    const mtc = await manager.findOne(MatchTicketCategory, { where: { id: mtcId }, lock: { mode: "pessimistic_write" } });
    if (mtc) {
      mtc.soldCount = Math.max(0, mtc.soldCount - tickets.length);
      await manager.save(mtc);
    }
  }
}

/**
 * Signal de modération non bloquant sur une catégorie HOME_SUPPORTERS/
 * AWAY_SUPPORTERS : marque `audience_mismatch` sur les billets si les
 * affiliations sso de l'acheteur (préférences déclaratives, voir
 * MemberTeamAffiliation côté sso) ne couvrent pas `relevantTeamId`.
 * N'est JAMAIS appelée avant la création des billets ni le paiement — voir
 * TicketSaleRule pour pourquoi ceci reste un signal de modération, jamais
 * une vérification d'identité ni un blocage d'achat. Ne doit jamais lever :
 * un échec de cet appel (sso indisponible, etc.) laisse simplement le
 * billet sans signal, pas sans vente.
 */
async function flagAudienceMismatchIfNeeded(ticketIds: string[], relevantTeamId: string): Promise<void> {
  try {
    const affiliatedTeamIds = await fetchMemberAffiliatedTeamIds();
    if (!affiliatedTeamIds || affiliatedTeamIds.has(relevantTeamId)) return;

    const ds = await getDataSource();
    await ds.getRepository(Ticket).update({ id: In(ticketIds) }, { audienceMismatch: true });
  } catch (error) {
    console.error("flagAudienceMismatchIfNeeded failed:", error);
  }
}

export interface PurgeStaleReservationsResult {
  releasedTickets: number;
  releasedCategories: number;
}

/**
 * Libère toutes les réservations PENDING abandonnées depuis plus de
 * PENDING_RESERVATION_TTL_MS, toutes catégories/matchs confondus — pas
 * seulement celle en cours d'achat (voir le rattrapage opportuniste dans
 * purchaseTickets, limité à la catégorie visée). Appelée périodiquement par
 * le scheduler in-process (instrumentation.ts) et, en option, par un
 * ordonnanceur externe via POST /api/cron/purge-pending-reservations.
 * Idempotente : ré-exécuter sur des billets déjà CANCELLED ne les affecte
 * pas (le WHERE ne cible que PENDING).
 */
export async function purgeStalePendingTickets(): Promise<PurgeStaleReservationsResult> {
  const ds = await getDataSource();
  const staleCutoff = new Date(Date.now() - PENDING_RESERVATION_TTL_MS);

  return ds.transaction(async (manager) => {
    const staleTickets = await manager.find(Ticket, {
      where: { status: "PENDING", createdAt: LessThan(staleCutoff) },
    });

    const byCategory = new Map<string, string[]>();
    for (const ticket of staleTickets) {
      const ids = byCategory.get(ticket.matchTicketCategoryId) ?? [];
      ids.push(ticket.id);
      byCategory.set(ticket.matchTicketCategoryId, ids);
    }

    for (const ticketIds of byCategory.values()) {
      await releaseTickets(manager, ticketIds);
    }

    return { releasedTickets: staleTickets.length, releasedCategories: byCategory.size };
  });
}

/**
 * Réserve les billets (PENDING) et valide toutes les règles serveur —
 * fenêtre de vente, audience, quota, capacité — puis, hors transaction,
 * initie le paiement auprès de payment-api. Si l'initiation échoue, la
 * réservation est libérée (compensation) plutôt que de laisser des billets
 * PENDING orphelins qu'aucun paiement ne pourra jamais confirmer.
 *
 * La confirmation (PENDING → PAID) n'arrive pas ici : voir
 * reconcileTicketPayment, appelée depuis la page de retour de paiement et
 * opportunément depuis listMyTickets (payment-api ne rappelle jamais
 * billetterie — seuls les providers rappellent payment-api).
 */
export async function purchaseTickets(input: PurchaseInput): Promise<PurchaseResult> {
  if (input.quantity < 1) {
    throw new ForbiddenError("La quantité doit être d'au moins 1 billet.");
  }

  // Paymee exige firstName/lastName/phoneNumber dès l'initiation (DTO
  // dédié côté payment-api) : vérifié avant toute réservation, pour ne
  // jamais bloquer des billets qu'on sait déjà ne pas pouvoir payer.
  let paymeeProfile: { firstName: string; lastName: string; phoneNumber: string } | undefined;
  if (getPaymentProvider() === "paymee") {
    const profile = await fetchMemberProfile();
    if (!profile?.firstName || !profile.lastName || !profile.phoneNumber) {
      throw new ForbiddenError(
        "Complétez votre prénom, nom et téléphone dans votre profil (espace membre) avant de payer par Paymee.",
      );
    }
    paymeeProfile = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phoneNumber: profile.phoneNumber,
    };
  }

  const ds = await getDataSource();

  const { tickets, mtc, allowedAudience, audienceValidationMode, homeTeamId, awayTeamId } = await ds.transaction(async (manager) => {
    const mtc = await manager.findOne(MatchTicketCategory, {
      where: { id: input.matchTicketCategoryId },
      lock: { mode: "pessimistic_write" },
    });
    if (!mtc) throw new NotFoundError("Catégorie de billet introuvable.");

    const match = await manager.findOne(Match, { where: { id: mtc.matchId } });
    if (!match || !match.isPublicVisible) throw new NotFoundError("Match introuvable.");
    if (match.status === "CANCELLED") {
      throw new ForbiddenError("Ce match a été annulé, achat impossible.");
    }

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
    const audienceValidationMode = rule?.audienceValidationMode ?? "DECLARATIVE";
    if (allowedAudience !== "PUBLIC") {
      if (audienceValidationMode === "STRICT") {
        // US-37/US-38 : vérification bloquante, remplace l'auto-déclaration
        // pour cette catégorie — affiliatedTeamIds reste déclaratif côté sso
        // (member_team_affiliations), mais devient ici un critère d'achat
        // et non plus un simple signal de modération après coup.
        const relevantTeamId = allowedAudience === "HOME_SUPPORTERS" ? match.equipeHome : match.equipeAway;
        const affiliatedTeamIds = await fetchMemberAffiliatedTeamIds();
        if (!affiliatedTeamIds || !affiliatedTeamIds.has(relevantTeamId)) {
          throw new ForbiddenError(
            allowedAudience === "HOME_SUPPORTERS"
              ? "Cette catégorie est réservée aux supporters affiliés au club recevant : votre profil ne l'indique pas."
              : "Cette catégorie est réservée aux supporters affiliés au club visiteur : votre profil ne l'indique pas.",
          );
        }
      } else if (!input.audienceConfirmed) {
        throw new ForbiddenError(
          allowedAudience === "HOME_SUPPORTERS"
            ? "Cette catégorie est réservée aux supporters du club recevant : merci de confirmer votre statut avant l'achat."
            : "Cette catégorie est réservée aux supporters du club visiteur : merci de confirmer votre statut avant l'achat.",
        );
      }
    }

    // Libère les réservations abandonnées de cette catégorie avant de
    // vérifier la capacité disponible.
    const staleCutoff = new Date(now.getTime() - PENDING_RESERVATION_TTL_MS);
    const staleTickets = await manager.find(Ticket, {
      where: { matchTicketCategoryId: mtc.id, status: "PENDING", createdAt: LessThan(staleCutoff) },
    });
    if (staleTickets.length > 0) {
      for (const ticket of staleTickets) ticket.status = "CANCELLED";
      await manager.save(staleTickets);
      mtc.soldCount = Math.max(0, mtc.soldCount - staleTickets.length);
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

    // TASK-P0-004 : UPDATE conditionnel atomique en défense en profondeur
    // du verrou pessimistic_write ci-dessus — la condition SQL elle-même
    // (et non plus seulement le check applicatif précédent) empêche tout
    // dépassement de capacité, y compris si ce code venait un jour à
    // s'exécuter hors du verrou. affected === 0 signifie que la capacité a
    // été consommée entre la lecture et l'écriture (ne devrait jamais
    // arriver sous le verrou, mais reste vérifié explicitement).
    const updateResult = await manager
      .createQueryBuilder()
      .update(MatchTicketCategory)
      .set({ soldCount: () => "sold_count + :qty" })
      .where("id = :id AND sold_count + :qty <= capacity", { id: mtc.id, qty: input.quantity })
      .execute();
    if (updateResult.affected !== 1) {
      throw new ConflictError("Il ne reste plus de billet disponible pour cette catégorie.");
    }
    mtc.soldCount += input.quantity;

    const tickets = Array.from({ length: input.quantity }, () =>
      manager.create(Ticket, {
        matchId: match.id,
        matchTicketCategoryId: mtc.id,
        organizerTeamId: match.equipeHome,
        purchaserId: input.purchaserId,
        status: "PENDING",
        reference: generateTicketReference(),
        price: mtc.price,
        paymentId: null,
        declaredAudience: allowedAudience,
      }),
    );
    const saved = await manager.save(tickets);
    return {
      tickets: saved,
      mtc,
      allowedAudience,
      audienceValidationMode,
      homeTeamId: match.equipeHome,
      awayTeamId: match.equipeAway,
    };
  });

  if (allowedAudience !== "PUBLIC" && audienceValidationMode === "DECLARATIVE") {
    // Best-effort, jamais bloquant : voir flagAudienceMismatchIfNeeded. En
    // mode STRICT, inutile — l'affiliation vient déjà d'être vérifiée de
    // façon bloquante ci-dessus, un billet STRICT ne peut pas être en
    // mismatch.
    void flagAudienceMismatchIfNeeded(
      tickets.map((t) => t.id),
      allowedAudience === "HOME_SUPPORTERS" ? homeTeamId : awayTeamId,
    );
  }

  const totalAmount = Math.round(parseFloat(mtc.price) * input.quantity * 1000) / 1000;
  // Référence du premier billet du lot : unique, sert d'orderId payment-api
  // pour tout le panier (un seul paiement couvre les `quantity` billets).
  const orderId = tickets[0].reference;

  let paymentId: string;
  let payUrl: string;
  try {
    const result = await initPayment({
      orderId,
      amount: totalAmount,
      email: input.purchaserEmail,
      userId: input.purchaserId,
      ...paymeeProfile,
    });
    paymentId = result.paymentId;
    payUrl = result.payUrl;
  } catch (error) {
    await ds.transaction((manager) => releaseTickets(manager, tickets.map((t) => t.id)));
    throw error;
  }

  const ticketIds = tickets.map((t) => t.id);
  await ds.getRepository(Ticket).update(ticketIds, { paymentId });
  tickets.forEach((t) => {
    t.paymentId = paymentId;
  });

  return { tickets, payUrl };
}

export type ReconcileResult = "PAID" | "PENDING" | "CANCELLED" | "PAID_STOCK_UNAVAILABLE";

/**
 * payment-api ne rappelle jamais billetterie : c'est à billetterie de
 * relire GET /payments/:id quand c'est pertinent (retour du payeur depuis
 * le provider, ou consultation de "mes billets"). Idempotent : ne modifie
 * que les billets encore PENDING pour ce paiement, sûr à appeler plusieurs
 * fois ou en concurrence.
 *
 * TASK-P0-016 : des billets déjà CANCELLED (capacité libérée par
 * purgeStalePendingTickets après PENDING_RESERVATION_TTL_MS) peuvent en
 * théorie correspondre à un paiement que le fournisseur a malgré tout
 * confirmé entre-temps (webhook très en retard, panne réseau prolongée) —
 * le client aurait alors payé sans repartir avec son billet, sans que
 * personne ne le sache. On vérifie donc explicitement le statut réel du
 * paiement dans ce cas précis plutôt que de faire confiance à l'état local.
 * Pas de remboursement automatique : payment-api n'expose encore aucune
 * primitive de remboursement (voir TASK-P1-007) — on journalise donc un
 * signal fort pour réconciliation manuelle par les ops.
 */
export async function reconcileTicketPayment(paymentId: string): Promise<ReconcileResult> {
  const ds = await getDataSource();
  const ticketRepo = ds.getRepository(Ticket);

  const pendingTickets = await ticketRepo.find({ where: { paymentId, status: "PENDING" } });
  if (pendingTickets.length === 0) {
    const any = await ticketRepo.findOne({ where: { paymentId } });
    if (!any) return "CANCELLED";
    if (any.status === "PAID") return "PAID";

    const lateStatus = await getPaymentStatus(paymentId);
    if (lateStatus === "PAID") {
      console.error(
        JSON.stringify({
          event: "ticket_paid_after_capacity_release",
          paymentId,
          matchTicketCategoryId: any.matchTicketCategoryId,
          timestamp: new Date().toISOString(),
        }),
      );
      return "PAID_STOCK_UNAVAILABLE";
    }
    return "CANCELLED";
  }

  const status = await getPaymentStatus(paymentId);

  if (status === "PAID") {
    await ds.transaction(async (manager) => {
      const tickets = await manager.find(Ticket, { where: { paymentId, status: "PENDING" } });
      const paidAt = new Date();
      for (const ticket of tickets) {
        ticket.status = "PAID";
        ticket.paidAt = paidAt;
      }
      await manager.save(tickets);
    });
    return "PAID";
  }

  if (status === "FAILED" || status === "EXPIRED") {
    await ds.transaction(async (manager) => {
      const tickets = await manager.find(Ticket, { where: { paymentId, status: "PENDING" } });
      await releaseTickets(
        manager,
        tickets.map((t) => t.id),
      );
    });
    return "CANCELLED";
  }

  return "PENDING";
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
  homeTeamNameAr: string | null;
  awayTeamNameAr: string | null;
  categoryName: string;
}

export async function listMyTickets(purchaserId: string): Promise<MyTicket[]> {
  const ds = await getDataSource();
  const ticketRepo = ds.getRepository(Ticket);

  // Rattrapage opportuniste : si le supporter n'est jamais passé par la
  // page de retour de paiement (onglet fermé, navigation directe vers
  // "mes billets"...), on relit le statut auprès de payment-api ici plutôt
  // que de laisser un billet payé afficher indéfiniment "En attente".
  const pendingWithPayment = await ticketRepo.find({
    where: { purchaserId, status: "PENDING", paymentId: Not(IsNull()) },
  });
  for (const ticket of pendingWithPayment) {
    if (ticket.paymentId) {
      await reconcileTicketPayment(ticket.paymentId).catch((error) => {
        console.error(`reconcileTicketPayment failed for payment ${ticket.paymentId}:`, error);
      });
    }
  }

  const tickets = await ticketRepo.find({ where: { purchaserId }, order: { createdAt: "DESC" } });
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
      homeTeamNameAr: match?.homeTeam?.nomAr ?? null,
      awayTeamNameAr: match?.awayTeam?.nomAr ?? null,
      categoryName: category?.name ?? "Catégorie",
    };
  });
}

export interface AudienceMismatchTicketSummary {
  id: string;
  reference: string;
  status: Ticket["status"];
  declaredAudience: Ticket["declaredAudience"];
  createdAt: Date;
  matchId: string;
  matchDate: Date | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamNameAr: string | null;
  awayTeamNameAr: string | null;
  categoryName: string;
  purchaserId: string;
}

/**
 * Alimente l'écran admin /admin/audience-mismatch : liste les billets où
 * l'acheteur a déclaré une audience (HOME_SUPPORTERS/AWAY_SUPPORTERS) non
 * couverte par ses affiliations sso au moment de l'achat (voir
 * flagAudienceMismatchIfNeeded ci-dessus). Signal de modération non
 * bloquant — un billet listé ici reste valide tant qu'il n'est pas traité
 * manuellement (voir dismissAudienceMismatch).
 */
export async function listAudienceMismatchTickets(matchId?: string): Promise<AudienceMismatchTicketSummary[]> {
  const ds = await getDataSource();
  const ticketRepo = ds.getRepository(Ticket);

  const tickets = await ticketRepo.find({
    where: matchId ? { audienceMismatch: true, matchId } : { audienceMismatch: true },
    order: { createdAt: "DESC" },
    take: 200,
  });
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
      declaredAudience: t.declaredAudience,
      createdAt: t.createdAt,
      matchId: t.matchId,
      matchDate: match?.date ?? null,
      homeTeamName: match?.homeTeam?.nom ?? "Équipe à domicile",
      awayTeamName: match?.awayTeam?.nom ?? "Équipe visiteuse",
      homeTeamNameAr: match?.homeTeam?.nomAr ?? null,
      awayTeamNameAr: match?.awayTeam?.nomAr ?? null,
      categoryName: category?.name ?? "Catégorie",
      purchaserId: t.purchaserId,
    };
  });
}

/**
 * Marque un billet comme traité par la modération : lève le signal une
 * fois qu'un admin l'a examiné (ex. faux positif, ou cas accepté). N'annule
 * jamais le billet — voir Ticket.audienceMismatch pour pourquoi ce signal
 * ne bloque jamais un achat.
 */
export async function dismissAudienceMismatch(ticketId: string): Promise<void> {
  const ds = await getDataSource();
  const ticketRepo = ds.getRepository(Ticket);
  const ticket = await ticketRepo.findOne({ where: { id: ticketId } });
  if (!ticket) {
    throw new NotFoundError("Billet introuvable.");
  }
  await ticketRepo.update({ id: ticketId }, { audienceMismatch: false });
}

/**
 * Révocation ciblée (TASK-P0-009) : invalide un billet précis avant sa
 * fin de vie naturelle (fraude détectée, litige, remboursement hors
 * flux...) sans attendre l'expiration du jeton QR (1 an, voir
 * src/lib/ticketQr.ts) ni toucher au statut du paiement. scanTicket()
 * rejette tout scan de ce billet avec l'outcome REVOKED tant que le champ
 * n'est pas remis à false. Idempotent : révoquer un billet déjà révoqué
 * ne fait que rafraîchir le motif/l'horodatage.
 */
export async function revokeTicket(ticketId: string, revokedBy: string, reason?: string): Promise<void> {
  const ds = await getDataSource();
  const ticketRepo = ds.getRepository(Ticket);
  const ticket = await ticketRepo.findOne({ where: { id: ticketId } });
  if (!ticket) {
    throw new NotFoundError("Billet introuvable.");
  }
  await ticketRepo.update(
    { id: ticketId },
    { revoked: true, revokedAt: new Date(), revokedReason: reason ?? null, revokedBy },
  );
}

/** Annule une révocation (erreur d'admin, litige résolu en faveur du porteur). */
export async function unrevokeTicket(ticketId: string): Promise<void> {
  const ds = await getDataSource();
  const ticketRepo = ds.getRepository(Ticket);
  const ticket = await ticketRepo.findOne({ where: { id: ticketId } });
  if (!ticket) {
    throw new NotFoundError("Billet introuvable.");
  }
  await ticketRepo.update({ id: ticketId }, { revoked: false, revokedAt: null, revokedReason: null, revokedBy: null });
}

export type ScanOutcome = "SUCCESS" | "ALREADY_USED" | "NOT_PAID" | "MATCH_CANCELLED" | "INVALID" | "REVOKED";

export interface ScanResult {
  outcome: ScanOutcome;
  reference?: string;
  matchLabel?: string;
  categoryName?: string;
  /** Horodatage du premier scan, fourni sur ALREADY_USED pour que le staff voie depuis quand. */
  usedAt?: Date | null;
}

/**
 * Scanner de contrôle d'accès (avancement.md, rang 2). Le jeton scanné
 * n'est jamais source de vérité : il ne fait qu'identifier le billet
 * (voir src/lib/ticketQr.ts) — le statut réel est toujours relu ici. Ne
 * vérifie pas que le billet correspond à un match précis (pas de sélection
 * de match par le staff) : le nom des équipes et la catégorie sont
 * retournés pour que le staff les confronte visuellement à l'écran,
 * comme dans la plupart des scanners d'entrée en usage réel.
 */
export async function scanTicket(token: string, scannedBy: string): Promise<ScanResult> {
  const ds = await getDataSource();
  const scanLogRepo = ds.getRepository(TicketScanLog);

  const ticketId = await verifyTicketToken(token);
  if (!ticketId) {
    await scanLogRepo.save(scanLogRepo.create({ ticketId: null, result: "INVALID", scannedBy }));
    return { outcome: "INVALID" };
  }

  const ticketRepo = ds.getRepository(Ticket);
  const ticket = await ticketRepo.findOne({ where: { id: ticketId } });
  if (!ticket) {
    await scanLogRepo.save(scanLogRepo.create({ ticketId, result: "INVALID", scannedBy }));
    return { outcome: "INVALID" };
  }

  const match = await ds.getRepository(Match).findOne({ where: { id: ticket.matchId }, relations: ["homeTeam", "awayTeam"] });
  const matchLabel = match ? `${match.homeTeam?.nom ?? "?"} - ${match.awayTeam?.nom ?? "?"}` : undefined;
  const mtc = await ds.getRepository(MatchTicketCategory).findOne({ where: { id: ticket.matchTicketCategoryId } });
  const category = mtc ? await ds.getRepository(TicketCategory).findOne({ where: { id: mtc.categoryId } }) : null;

  const base = { reference: ticket.reference, matchLabel, categoryName: category?.name };

  if (ticket.revoked) {
    await scanLogRepo.save(scanLogRepo.create({ ticketId, result: "REVOKED", scannedBy }));
    return { outcome: "REVOKED", ...base };
  }

  if (match?.status === "CANCELLED") {
    await scanLogRepo.save(scanLogRepo.create({ ticketId, result: "MATCH_CANCELLED", scannedBy }));
    return { outcome: "MATCH_CANCELLED", ...base };
  }

  if (ticket.status === "USED") {
    await scanLogRepo.save(scanLogRepo.create({ ticketId, result: "ALREADY_USED", scannedBy }));
    return { outcome: "ALREADY_USED", ...base, usedAt: ticket.usedAt };
  }

  if (ticket.status !== "PAID") {
    await scanLogRepo.save(scanLogRepo.create({ ticketId, result: "NOT_PAID", scannedBy }));
    return { outcome: "NOT_PAID", ...base };
  }

  await ticketRepo.update({ id: ticketId }, { status: "USED", usedAt: new Date() });
  await scanLogRepo.save(scanLogRepo.create({ ticketId, result: "SUCCESS", scannedBy }));
  return { outcome: "SUCCESS", ...base };
}

export interface RecentScan {
  id: string;
  result: ScanOutcome;
  scannedBy: string;
  scannedAt: Date;
  reference: string | null;
}

export async function listRecentScans(limit = 20): Promise<RecentScan[]> {
  const ds = await getDataSource();
  const logs = await ds.getRepository(TicketScanLog).find({ order: { scannedAt: "DESC" }, take: limit });
  if (logs.length === 0) return [];

  const ticketIds = Array.from(new Set(logs.map((l) => l.ticketId).filter((id): id is string => !!id)));
  const tickets = ticketIds.length > 0 ? await ds.getRepository(Ticket).find({ where: { id: In(ticketIds) } }) : [];
  const referenceByTicketId = new Map(tickets.map((t) => [t.id, t.reference]));

  return logs.map((l) => ({
    id: l.id,
    result: l.result,
    scannedBy: l.scannedBy,
    scannedAt: l.scannedAt,
    reference: l.ticketId ? (referenceByTicketId.get(l.ticketId) ?? null) : null,
  }));
}

export interface OfflineManifestTicket {
  ticketId: string;
  reference: string;
  status: "PAID" | "USED";
  categoryName: string;
}

export interface OfflineScanManifest {
  matchId: string;
  matchLabel: string;
  matchCancelled: boolean;
  generatedAt: string;
  tickets: OfflineManifestTicket[];
}

/**
 * Manifeste hors-ligne (avancement.md, rang 2 — mode offline du scanner) :
 * téléchargé une fois en ligne pour un match donné, avant d'entrer dans une
 * zone sans réseau. Ne contient jamais le secret de signature ni un jeton
 * réutilisable — seulement `ticketId`/statut/référence, assez pour que le
 * scanner évalue localement un jeton déjà scanné en douchette/caméra (dont
 * le `ticketId` est lu depuis la charge utile du JWT, sans vérification de
 * signature possible côté client — voir src/lib/offlineScan.ts). La
 * vérification cryptographique réelle n'a lieu qu'à la synchronisation
 * (POST /api/admin/tickets/scan, une fois la connexion revenue) : un jeton
 * accepté hors-ligne sur la seule foi du manifeste peut donc être rejeté
 * après coup si forgé, ce qui est le compromis assumé de ce mode (voir
 * avancement.md, risque de double scan entre appareils non synchronisés).
 */
export async function getOfflineScanManifest(matchId: string): Promise<OfflineScanManifest> {
  const ds = await getDataSource();

  const match = await ds
    .getRepository(Match)
    .findOne({ where: { id: matchId }, relations: ["homeTeam", "awayTeam"] });
  if (!match) {
    throw new NotFoundError("Match introuvable.");
  }

  const tickets = await ds.getRepository(Ticket).find({ where: { matchId, status: In(["PAID", "USED"]) } });
  const mtcIds = Array.from(new Set(tickets.map((t) => t.matchTicketCategoryId)));
  const mtcs = mtcIds.length > 0 ? await ds.getRepository(MatchTicketCategory).find({ where: { id: In(mtcIds) } }) : [];
  const categoryIds = Array.from(new Set(mtcs.map((m) => m.categoryId)));
  const categories = categoryIds.length > 0 ? await ds.getRepository(TicketCategory).find({ where: { id: In(categoryIds) } }) : [];
  const categoryNameByMtcId = new Map(
    mtcs.map((mtc) => [mtc.id, categories.find((c) => c.id === mtc.categoryId)?.name ?? "Catégorie"]),
  );

  return {
    matchId,
    matchLabel: `${match.homeTeam?.nom ?? "?"} - ${match.awayTeam?.nom ?? "?"}`,
    matchCancelled: match.status === "CANCELLED",
    generatedAt: new Date().toISOString(),
    // Un billet révoqué (TASK-P0-009) est exclu du manifeste plutôt que
    // marqué d'un statut dédié : evaluateOfflineScan (src/lib/offlineScan.ts)
    // rejette alors le scan en INVALID (entrée introuvable), un refus sûr
    // par défaut tant que la resynchronisation serveur (seule source
    // faisant foi) n'a pas eu lieu — cohérent avec la révocation qui doit
    // s'appliquer immédiatement, pas seulement au prochain téléchargement
    // de manifeste.
    tickets: tickets
      .filter((t) => !t.revoked)
      .map((t) => ({
        ticketId: t.id,
        reference: t.reference,
        status: t.status as "PAID" | "USED",
        categoryName: categoryNameByMtcId.get(t.matchTicketCategoryId) ?? "Catégorie",
      })),
  };
}
