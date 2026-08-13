"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { SubscriptionService } from "@/services/SubscriptionService";
import { AuditLogService } from "@/services/AuditLogService";
import { createSubscriptionCategorySchema, updateSubscriptionCategorySchema } from "@/types/subscriptions";

function parseFormData(formData: FormData) {
  return {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    price: Number(formData.get("price")),
    color: (formData.get("color") as string) || null,
    validFrom: formData.get("validFrom") as string,
    validUntil: formData.get("validUntil") as string,
    isActive: formData.get("isActive") === "on",
  };
}

/** Crée une catégorie d'abonnement du club — réservé ADMIN. */
export async function createSubscriptionCategory(formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = createSubscriptionCategorySchema.parse(parseFormData(formData));

    const teamId = await requireTeamId();
    const service = new SubscriptionService();
    const category = await service.createCategory(teamId, {
      ...data,
      price: data.price.toFixed(3),
      validFrom: new Date(`${data.validFrom}T00:00:00.000Z`),
      validUntil: new Date(`${data.validUntil}T00:00:00.000Z`),
    });

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "SubscriptionCategory",
      entityId: category.id,
      after: category,
    });

    revalidatePath("/admin/billetterie/subscriptions");
    return { success: true, message: "Catégorie d'abonnement créée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

/** Met à jour une catégorie d'abonnement — réservé ADMIN. */
export async function updateSubscriptionCategory(id: string, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const raw = parseFormData(formData);
    const data = updateSubscriptionCategorySchema.parse({
      ...raw,
      name: raw.name || undefined,
      price: Number.isNaN(raw.price) ? undefined : raw.price,
      validFrom: raw.validFrom || undefined,
      validUntil: raw.validUntil || undefined,
    });

    const teamId = await requireTeamId();
    const service = new SubscriptionService();
    const before = await service.findCategory(id, teamId);
    const category = await service.updateCategory(id, teamId, {
      ...data,
      price: data.price !== undefined ? data.price.toFixed(3) : undefined,
      validFrom: data.validFrom ? new Date(`${data.validFrom}T00:00:00.000Z`) : undefined,
      validUntil: data.validUntil ? new Date(`${data.validUntil}T00:00:00.000Z`) : undefined,
    });

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "SubscriptionCategory",
      entityId: id,
      before: before ?? undefined,
      after: category,
    });

    revalidatePath("/admin/billetterie/subscriptions");
    return { success: true, message: "Catégorie d'abonnement modifiée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

/** Supprime une catégorie d'abonnement — réservé ADMIN. */
export async function deleteSubscriptionCategory(id: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const service = new SubscriptionService();
    const before = await service.findCategory(id, teamId);
    await service.deleteCategory(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "SubscriptionCategory",
      entityId: id,
      before: before ?? undefined,
    });

    revalidatePath("/admin/billetterie/subscriptions");
    return { success: true, message: "Catégorie d'abonnement supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
