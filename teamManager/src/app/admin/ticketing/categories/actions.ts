"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { TicketCategoryService } from "@/services/TicketCategoryService";
import { AuditLogService } from "@/services/AuditLogService";
import { createTicketCategorySchema, updateTicketCategorySchema } from "@/types/ticketing";

function readForm(formData: FormData) {
  return {
    name: (formData.get("name") as string) || "",
    nameAr: (formData.get("nameAr") as string) || null,
    description: (formData.get("description") as string) || null,
    price: parseFloat((formData.get("price") as string) || "0"),
    color: (formData.get("color") as string) || null,
    isActive: formData.get("isActive") === "on",
    displayOrder: parseInt((formData.get("displayOrder") as string) || "0", 10),
  };
}

export async function createTicketCategory(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.manageCategories");

    const data = createTicketCategorySchema.parse(readForm(formData));
    const teamId = await requireTeamId();
    const service = new TicketCategoryService();
    const category = await service.create(data, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "CREATE", entity: "TicketCategory", entityId: String(category.id) });

    revalidatePath("/admin/ticketing/categories");
    return { success: true, message: "Catégorie créée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateTicketCategory(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.manageCategories");

    const data = updateTicketCategorySchema.parse(readForm(formData));
    const teamId = await requireTeamId();
    const service = new TicketCategoryService();
    await service.update(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "UPDATE", entity: "TicketCategory", entityId: String(id) });

    revalidatePath("/admin/ticketing/categories");
    return { success: true, message: "Catégorie modifiée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteTicketCategory(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.manageCategories");

    const teamId = await requireTeamId();
    const service = new TicketCategoryService();
    await service.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "DELETE", entity: "TicketCategory", entityId: String(id) });

    revalidatePath("/admin/ticketing/categories");
    return { success: true, message: "Catégorie supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
