"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { ProductCategoryService } from "@/services/ProductCategoryService";
import { AuditLogService } from "@/services/AuditLogService";
import { createProductCategorySchema, updateProductCategorySchema } from "@/types/products";

/** Crée une catégorie de produits de la boutique — réservé ADMIN. */
export async function createProductCategory(formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = createProductCategorySchema.parse({
      nameFr: formData.get("nameFr") as string,
      nameAr: (formData.get("nameAr") as string) || null,
    });

    const teamId = await requireTeamId();
    const productCategoryService = new ProductCategoryService();
    const category = await productCategoryService.create(data, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "ProductCategory",
      entityId: String(category.id),
      after: category,
    });

    revalidatePath("/admin/shop/categories");
    revalidatePath("/admin/shop/products");
    return { success: true, message: "Catégorie créée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

/** Met à jour une catégorie de produits — réservé ADMIN. */
export async function updateProductCategory(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = updateProductCategorySchema.parse({
      nameFr: (formData.get("nameFr") as string) || undefined,
      nameAr: (formData.get("nameAr") as string) || null,
    });

    const teamId = await requireTeamId();
    const productCategoryService = new ProductCategoryService();
    const before = await productCategoryService.findById(id, teamId);
    const category = await productCategoryService.update(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "ProductCategory",
      entityId: String(id),
      before: before ?? undefined,
      after: category,
    });

    revalidatePath("/admin/shop/categories");
    revalidatePath("/admin/shop/products");
    return { success: true, message: "Catégorie modifiée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

/** Supprime une catégorie de produits — réservé ADMIN. */
export async function deleteProductCategory(id: number) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const productCategoryService = new ProductCategoryService();
    const before = await productCategoryService.findById(id, teamId);
    await productCategoryService.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "ProductCategory",
      entityId: String(id),
      before: before ?? undefined,
    });

    revalidatePath("/admin/shop/categories");
    revalidatePath("/admin/shop/products");
    return { success: true, message: "Catégorie supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
