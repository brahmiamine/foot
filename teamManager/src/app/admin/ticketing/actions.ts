"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { TicketingEventService } from "@/services/TicketingEventService";
import { AuditLogService } from "@/services/AuditLogService";
import { createTicketingEventSchema, setEventCategoryQuotaSchema } from "@/types/ticketing";
import type { TicketingEventStatus } from "@/entities/TicketingEvent";

export async function createTicketingEvent(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.create");

    const matchRef = (formData.get("matchRef") as string) || "";
    const [matchType, matchRefId] = matchRef.split(":");
    const categoriesJson = (formData.get("categoriesJson") as string) || "[]";

    const data = createTicketingEventSchema.parse({
      matchType: matchType === "OFFICIAL" || matchType === "FRIENDLY" ? matchType : undefined,
      matchId: matchType === "OFFICIAL" ? matchRefId : null,
      friendlyMatchId: matchType === "FRIENDLY" && matchRefId ? parseInt(matchRefId, 10) : null,
      salesStartAt: formData.get("salesStartAt") ? new Date(formData.get("salesStartAt") as string) : null,
      salesEndAt: formData.get("salesEndAt") ? new Date(formData.get("salesEndAt") as string) : null,
      maxTicketsPerOrder: parseInt((formData.get("maxTicketsPerOrder") as string) || "5", 10),
      categories: JSON.parse(categoriesJson),
    });

    const teamId = await requireTeamId();
    const service = new TicketingEventService();
    const event = await service.create(data, teamId, session.user.id);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "CREATE", entity: "TicketingEvent", entityId: String(event.id) });

    revalidatePath("/admin/ticketing");
    return { success: true, message: "Billetterie créée avec succès", id: event.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function setTicketingEventStatus(id: number, status: TicketingEventStatus) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    const permissionByStatus: Partial<Record<TicketingEventStatus, string>> = {
      OPEN: "ticketing.open",
      CLOSED: "ticketing.close",
      CANCELLED: "ticketing.cancel",
      SCHEDULED: "ticketing.update",
    };
    requirePermission(access, permissionByStatus[status] ?? "ticketing.update");

    const teamId = await requireTeamId();
    const service = new TicketingEventService();
    await service.setStatus(id, teamId, status);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "UPDATE", entity: "TicketingEvent", entityId: String(id), after: { status } });

    revalidatePath("/admin/ticketing");
    revalidatePath(`/admin/ticketing/${id}`);
    return { success: true, message: "Statut mis à jour" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du changement de statut" };
  }
}

export async function updateTicketingEventSettings(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.update");

    const teamId = await requireTeamId();
    const service = new TicketingEventService();
    await service.update(id, teamId, {
      salesStartAt: formData.get("salesStartAt") ? new Date(formData.get("salesStartAt") as string) : null,
      salesEndAt: formData.get("salesEndAt") ? new Date(formData.get("salesEndAt") as string) : null,
      maxTicketsPerOrder: parseInt((formData.get("maxTicketsPerOrder") as string) || "5", 10),
    });

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "UPDATE", entity: "TicketingEvent", entityId: String(id) });

    revalidatePath(`/admin/ticketing/${id}`);
    return { success: true, message: "Réglages mis à jour" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la mise à jour" };
  }
}

export async function setEventCategoryQuota(ticketingEventId: number, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.manageQuotas");

    const data = setEventCategoryQuotaSchema.parse({
      ticketCategoryId: parseInt(formData.get("ticketCategoryId") as string, 10),
      quota: parseInt(formData.get("quota") as string, 10),
      isAvailable: formData.get("isAvailable") === "on",
    });

    const teamId = await requireTeamId();
    const service = new TicketingEventService();
    await service.setCategoryQuota(ticketingEventId, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "UPDATE", entity: "TicketingEventCategory", entityId: `${ticketingEventId}:${data.ticketCategoryId}` });

    revalidatePath(`/admin/ticketing/${ticketingEventId}`);
    return { success: true, message: "Quota mis à jour" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la mise à jour du quota" };
  }
}

export async function removeEventCategory(ticketingEventId: number, ticketCategoryId: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.manageQuotas");

    const teamId = await requireTeamId();
    const service = new TicketingEventService();
    await service.removeCategory(ticketingEventId, teamId, ticketCategoryId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "DELETE", entity: "TicketingEventCategory", entityId: `${ticketingEventId}:${ticketCategoryId}` });

    revalidatePath(`/admin/ticketing/${ticketingEventId}`);
    return { success: true, message: "Catégorie retirée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du retrait" };
  }
}

export async function deleteTicketingEvent(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.update");

    const teamId = await requireTeamId();
    const service = new TicketingEventService();
    await service.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "DELETE", entity: "TicketingEvent", entityId: String(id) });

    revalidatePath("/admin/ticketing");
    return { success: true, message: "Billetterie supprimée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
