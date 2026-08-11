"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { TicketService } from "@/services/TicketService";
import { AuditLogService } from "@/services/AuditLogService";

export async function cancelTicket(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.cancelTicket");

    const teamId = await requireTeamId();
    const service = new TicketService();
    const ticket = await service.cancel(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "UPDATE", entity: "Ticket", entityId: String(id), after: { status: ticket.status } });

    revalidatePath("/admin/ticketing/tickets");
    revalidatePath("/admin/ticketing/orders");
    return { success: true, message: "Billet annulé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'annulation" };
  }
}
