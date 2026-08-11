"use server";

import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { TicketService } from "@/services/TicketService";
import { TicketCategoryService } from "@/services/TicketCategoryService";
import type { TicketScanResult } from "@/entities/TicketScan";

export interface ScanResultPayload {
  result: TicketScanResult;
  ticketNumber?: string;
  categoryName?: string;
  holderName?: string;
}

/**
 * Valide un scan de billet. La validation elle-même est atomique côté
 * TicketService (verrou pessimiste en transaction) — cette action ne fait
 * que vérifier la permission et enrichir la réponse pour l'affichage.
 */
export async function scanTicket(ticketingEventId: number, token: string, gate: string | null, deviceId: string | null): Promise<{ success: true; data: ScanResultPayload } | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.scan");

    if (!token.trim()) {
      throw new Error("Aucun code à scanner");
    }

    const teamId = await requireTeamId();
    const service = new TicketService();
    const outcome = await service.validateScan(token.trim(), teamId, ticketingEventId, session.user.id, gate, deviceId);

    let categoryName: string | undefined;
    if (outcome.ticket) {
      const categories = await new TicketCategoryService().findAll(teamId);
      categoryName = categories.find((c) => c.id === outcome.ticket!.ticketCategoryId)?.name;
    }

    return {
      success: true,
      data: {
        result: outcome.result,
        ticketNumber: outcome.ticket?.ticketNumber,
        categoryName,
        holderName: outcome.ticket ? [outcome.ticket.holderFirstName, outcome.ticket.holderLastName].filter(Boolean).join(" ") || undefined : undefined,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la validation" };
  }
}
