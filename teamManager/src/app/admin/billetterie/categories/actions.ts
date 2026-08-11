"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { TicketingService } from "@/services/TicketingService";
import { AuditLogService } from "@/services/AuditLogService";
import { createTicketCategorySchema, updateTicketCategorySchema } from "@/types/ticketing";

/** Crée une catégorie de billet du club — réservé ADMIN. */
export async function createTicketCategory(formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = createTicketCategorySchema.parse({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      basePrice: Number(formData.get("basePrice")),
      isActive: formData.get("isActive") === "on",
    });

    const teamId = await requireTeamId();
    const service = new TicketingService();
    const category = await service.createCategory(teamId, { ...data, basePrice: data.basePrice.toFixed(3) });

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "TicketCategory",
      entityId: category.id,
      after: category,
    });

    revalidatePath("/admin/billetterie/categories");
    return { success: true, message: "Catégorie créée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

/** Met à jour une catégorie de billet — réservé ADMIN. */
export async function updateTicketCategory(id: string, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = updateTicketCategorySchema.parse({
      name: (formData.get("name") as string) || undefined,
      description: (formData.get("description") as string) || null,
      basePrice: formData.get("basePrice") ? Number(formData.get("basePrice")) : undefined,
      isActive: formData.get("isActive") === "on",
    });

    const teamId = await requireTeamId();
    const service = new TicketingService();
    const before = await service.findCategory(id, teamId);
    const category = await service.updateCategory(id, teamId, {
      ...data,
      basePrice: data.basePrice !== undefined ? data.basePrice.toFixed(3) : undefined,
    });

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "TicketCategory",
      entityId: id,
      before: before ?? undefined,
      after: category,
    });

    revalidatePath("/admin/billetterie/categories");
    return { success: true, message: "Catégorie modifiée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

/** Supprime une catégorie de billet — réservé ADMIN. */
export async function deleteTicketCategory(id: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const service = new TicketingService();
    const before = await service.findCategory(id, teamId);
    await service.deleteCategory(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "TicketCategory",
      entityId: id,
      before: before ?? undefined,
    });

    revalidatePath("/admin/billetterie/categories");
    return { success: true, message: "Catégorie supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
