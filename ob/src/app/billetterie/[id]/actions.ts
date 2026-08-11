"use server";

import { getObTeam } from "@/lib/ob-team";
import { getSsoSession } from "@/lib/ssoSession";
import { TicketPurchaseService } from "@/services/TicketPurchaseService";

export async function reserveTickets(
  ticketingEventId: number,
  items: Array<{ ticketCategoryId: number; quantity: number }>
): Promise<{ success: true; orderId: number } | { success: false; error: string }> {
  try {
    const team = await getObTeam();
    if (!team) throw new Error("Club non configuré");

    const session = await getSsoSession();
    const userId = session && session.role === "MEMBER" ? session.id : null;

    const service = new TicketPurchaseService();
    const { orderId } = await service.createHold(ticketingEventId, team.id, items, userId);

    return { success: true, orderId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la réservation" };
  }
}
