"use server";

import { getObTeam } from "@/lib/ob-team";
import { TicketPurchaseService } from "@/services/TicketPurchaseService";
import { resolveTicketDisplayInfo, type TicketDisplayInfo } from "./ticketDisplay";

export async function lookupGuestTickets(orderNumber: string, email: string): Promise<{ success: true; tickets: TicketDisplayInfo[] } | { success: false; error: string }> {
  try {
    const team = await getObTeam();
    if (!team) throw new Error("Club non configuré");

    const service = new TicketPurchaseService();
    const result = await service.lookupGuestOrder(orderNumber.trim(), email.trim(), team.id);
    if (!result) {
      throw new Error("Aucune commande trouvée avec ce numéro et cet email");
    }

    const tickets = await resolveTicketDisplayInfo(result.tickets, team.id);
    return { success: true, tickets };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la recherche" };
  }
}
