import { randomBytes } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { TicketingEvent } from "@/entities/TicketingEvent";
import { TicketingEventCategory } from "@/entities/TicketingEventCategory";
import { TicketCategory } from "@/entities/TicketCategory";
import { TicketOrder } from "@/entities/TicketOrder";
import { TicketOrderItem } from "@/entities/TicketOrderItem";
import { TicketHold } from "@/entities/TicketHold";
import { Ticket } from "@/entities/Ticket";
import { IsNull, MoreThan, In } from "typeorm";
import { encryptToken, hashToken, decryptToken } from "@/lib/ticketToken";

export const HOLD_DURATION_MINUTES = 10;

export interface CartItemInput {
  ticketCategoryId: number;
  quantity: number;
}

function generateOrderNumber(): string {
  return `OB-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function generateTicketToken(): { token: string; hash: string; encrypted: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token), encrypted: encryptToken(token) };
}

function generateTicketNumber(): string {
  return `TKT-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export interface IssuedTicketResult {
  id: number;
  ticketNumber: string;
  token: string;
  categoryName: string;
}

/**
 * Service d'achat côté site public : réservation temporaire (hold) puis
 * confirmation. Toute vérification de quota/dispo se fait ici, en base,
 * jamais côté frontend. V1 sans paiement : la confirmation émet les
 * billets directement en statut ISSUED.
 */
export class TicketPurchaseService {
  /**
   * Crée une commande PENDING + des holds par catégorie (quantité, pas de
   * billets individuels à ce stade). Transaction avec verrou pessimiste sur
   * les lignes de quota pour empêcher toute survente en cas de réservations
   * concurrentes sur la même catégorie.
   */
  async createHold(ticketingEventId: number, teamId: string, items: CartItemInput[], userId: string | null): Promise<{ orderId: number; expiresAt: Date }> {
    const cleanItems = items.filter((i) => i.quantity > 0);
    if (cleanItems.length === 0) {
      throw new Error("Aucun billet sélectionné");
    }

    const dataSource = await getDataSource();
    return dataSource.transaction(async (manager) => {
      const event = await manager.findOne(TicketingEvent, { where: { id: ticketingEventId, teamId } });
      if (!event) throw new Error("Billetterie introuvable");
      if (event.status !== "OPEN") throw new Error("Cette billetterie n'est pas ouverte à la vente");

      const now = new Date();
      if (event.salesStartAt && event.salesStartAt > now) throw new Error("La vente n'est pas encore ouverte");
      if (event.salesEndAt && event.salesEndAt < now) throw new Error("La vente est terminée");

      const totalQuantity = cleanItems.reduce((sum, i) => sum + i.quantity, 0);
      if (totalQuantity > event.maxTicketsPerOrder) {
        throw new Error(`Maximum ${event.maxTicketsPerOrder} billets par commande`);
      }

      const expiresAt = new Date(now.getTime() + HOLD_DURATION_MINUTES * 60_000);
      const order = await manager.save(
        manager.create(TicketOrder, {
          teamId,
          ticketingEventId,
          orderNumber: generateOrderNumber(),
          userId,
          customerFirstName: "",
          customerLastName: "",
          customerEmail: "",
          status: "PENDING",
          expiresAt,
        })
      );

      for (const item of cleanItems) {
        const eventCategory = await manager.findOne(TicketingEventCategory, {
          where: { ticketingEventId, ticketCategoryId: item.ticketCategoryId },
          lock: { mode: "pessimistic_write" },
        });
        if (!eventCategory || !eventCategory.isAvailable) {
          throw new Error("Catégorie de billet indisponible");
        }

        const activeHolds = await manager.find(TicketHold, {
          where: { ticketingEventId, ticketCategoryId: item.ticketCategoryId, releasedAt: IsNull(), expiresAt: MoreThan(now) },
        });
        const heldQuantity = activeHolds.reduce((sum, h) => sum + h.quantity, 0);
        const available = eventCategory.quota - eventCategory.soldCount - heldQuantity;

        if (item.quantity > available) {
          throw new Error(`Il ne reste que ${Math.max(0, available)} billet(s) disponible(s) dans cette catégorie`);
        }

        await manager.save(
          manager.create(TicketOrderItem, {
            orderId: order.id,
            ticketCategoryId: item.ticketCategoryId,
            quantity: item.quantity,
            unitPrice: "0",
          })
        );

        await manager.save(
          manager.create(TicketHold, {
            teamId,
            ticketingEventId,
            orderId: order.id,
            ticketCategoryId: item.ticketCategoryId,
            quantity: item.quantity,
            expiresAt,
          })
        );
      }

      // Fixe le prix unitaire réel (catalogue), une fois les items créés.
      const categories = await manager.find(TicketCategory, { where: { teamId } });
      const categoryPriceById = new Map(categories.map((c) => [c.id, c.price]));
      const items2 = await manager.find(TicketOrderItem, { where: { orderId: order.id } });
      for (const it of items2) {
        it.unitPrice = categoryPriceById.get(it.ticketCategoryId) ?? "0";
        await manager.save(it);
      }

      return { orderId: order.id, expiresAt };
    });
  }

  async getOrder(orderId: number, teamId: string): Promise<TicketOrder | null> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TicketOrder).findOne({ where: { id: orderId, teamId } });
  }

  async getOrderItems(orderId: number): Promise<Array<TicketOrderItem & { categoryName: string }>> {
    const dataSource = await getDataSource();
    const items = await dataSource.getRepository(TicketOrderItem).find({ where: { orderId } });
    const categories = await dataSource.getRepository(TicketCategory).find({});
    const nameById = new Map(categories.map((c) => [c.id, c.name]));
    return items.map((i) => Object.assign(i, { categoryName: nameById.get(i.ticketCategoryId) ?? "?" }));
  }

  /**
   * Confirme une commande PENDING : re-vérifie que le hold n'a pas expiré,
   * verrouille les lignes de quota, crée un billet par unité commandée
   * (statut ISSUED direct, pas de paiement en V1), incrémente sold_count,
   * et libère le hold. Chaque billet reçoit un token unique — la valeur
   * brute n'est renvoyée qu'ici, une seule fois ; seul son hash est stocké.
   */
  async confirmOrder(
    orderId: number,
    teamId: string,
    customer: { firstName: string; lastName: string; email: string; phone: string | null; userId: string | null }
  ): Promise<{ order: TicketOrder; tickets: IssuedTicketResult[] }> {
    const dataSource = await getDataSource();
    return dataSource.transaction(async (manager) => {
      const order = await manager.findOne(TicketOrder, { where: { id: orderId, teamId }, lock: { mode: "pessimistic_write" } });
      if (!order) throw new Error("Commande introuvable");
      if (order.status === "CONFIRMED") throw new Error("Cette commande a déjà été confirmée");
      if (order.status !== "PENDING") throw new Error("Cette commande n'est plus valide");
      if (order.expiresAt && order.expiresAt < new Date()) {
        order.status = "EXPIRED";
        await manager.save(order);
        throw new Error("Le délai de réservation a expiré, veuillez recommencer");
      }

      const items = await manager.find(TicketOrderItem, { where: { orderId } });
      const categories = await manager.find(TicketCategory, { where: { teamId } });
      const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

      const issuedTickets: IssuedTicketResult[] = [];
      const now = new Date();

      for (const item of items) {
        const eventCategory = await manager.findOne(TicketingEventCategory, {
          where: { ticketingEventId: order.ticketingEventId, ticketCategoryId: item.ticketCategoryId },
          lock: { mode: "pessimistic_write" },
        });
        if (!eventCategory) throw new Error("Catégorie de billet introuvable");
        if (eventCategory.soldCount + item.quantity > eventCategory.quota) {
          throw new Error("Quota dépassé pour une catégorie, veuillez recommencer votre réservation");
        }

        for (let i = 0; i < item.quantity; i++) {
          const { token, hash, encrypted } = generateTicketToken();
          const ticket = await manager.save(
            manager.create(Ticket, {
              teamId,
              ticketingEventId: order.ticketingEventId,
              orderId: order.id,
              orderItemId: item.id,
              ticketCategoryId: item.ticketCategoryId,
              ticketNumber: generateTicketNumber(),
              tokenHash: hash,
              tokenEncrypted: encrypted,
              holderFirstName: customer.firstName,
              holderLastName: customer.lastName,
              status: "ISSUED",
              issuedAt: now,
            })
          );
          issuedTickets.push({ id: ticket.id, ticketNumber: ticket.ticketNumber, token, categoryName: categoryNameById.get(item.ticketCategoryId) ?? "?" });
        }

        eventCategory.soldCount += item.quantity;
        await manager.save(eventCategory);
      }

      order.customerFirstName = customer.firstName;
      order.customerLastName = customer.lastName;
      order.customerEmail = customer.email;
      order.customerPhone = customer.phone;
      order.userId = customer.userId;
      order.status = "CONFIRMED";
      await manager.save(order);

      await manager.update(TicketHold, { orderId: order.id, releasedAt: IsNull() }, { releasedAt: now });

      return { order, tickets: issuedTickets };
    });
  }

  /** Billets d'un supporter connecté (compte MEMBER), toutes commandes confirmées confondues. */
  async getTicketsForUser(userId: string, teamId: string): Promise<Ticket[]> {
    const dataSource = await getDataSource();
    const orders = await dataSource.getRepository(TicketOrder).find({ where: { userId, teamId, status: "CONFIRMED" } });
    if (orders.length === 0) return [];
    const orderIds = orders.map((o) => o.id);
    return dataSource.getRepository(Ticket).find({ where: { orderId: In(orderIds) }, order: { id: "DESC" } });
  }

  /** Récupération invité : commande confirmée par numéro + email (aucun compte requis). */
  async lookupGuestOrder(orderNumber: string, email: string, teamId: string): Promise<{ order: TicketOrder; tickets: Ticket[] } | null> {
    const dataSource = await getDataSource();
    const order = await dataSource.getRepository(TicketOrder).findOne({ where: { orderNumber, customerEmail: email, teamId, status: "CONFIRMED" } });
    if (!order) return null;
    const tickets = await dataSource.getRepository(Ticket).find({ where: { orderId: order.id }, order: { id: "ASC" } });
    return { order, tickets };
  }

  async getTicketById(id: number, teamId: string): Promise<Ticket | null> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Ticket).findOne({ where: { id, teamId } });
  }

  /** Redéchiffre le token d'un billet déjà émis, pour ré-afficher son QR (voir lib/ticketToken.ts). */
  getRawToken(ticket: Ticket): string {
    return decryptToken(ticket.tokenEncrypted);
  }

  /**
   * Vérifie qu'un billet appartient bien à cet utilisateur (compte MEMBER)
   * ou à cette adresse email (invité) avant d'autoriser un téléchargement.
   */
  async canAccessTicket(ticket: Ticket, opts: { userId?: string | null; email?: string | null }): Promise<boolean> {
    const dataSource = await getDataSource();
    const order = await dataSource.getRepository(TicketOrder).findOne({ where: { id: ticket.orderId } });
    if (!order) return false;
    if (opts.userId && order.userId === opts.userId) return true;
    if (opts.email && order.customerEmail.toLowerCase() === opts.email.toLowerCase()) return true;
    return false;
  }
}
