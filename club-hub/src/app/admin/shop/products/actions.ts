"use server";

import { revalidatePath } from "next/cache";
import { getUserAccess } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { ProductService } from "@/services/ProductService";
import { ClubApprovalService } from "@/services/ClubApprovalService";
import { AuditLogService } from "@/services/AuditLogService";
import { createProductSchema, updateProductSchema } from "@/types/products";

const approvalService = new ClubApprovalService();

function revalidateProducts() {
  revalidatePath("/admin/shop/products");
  revalidatePath("/admin/approvals");
  revalidatePath("/boutique");
}

/** Crée un produit de la boutique du club — réservé à l'admin du club. */
export async function createProduct(formData: FormData) {
  try {
    const access = await getUserAccess();
    if (!access.isClubAdmin) {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const categoryIdValue = formData.get("categoryId");
    const priceValue = formData.get("price");
    const stockValue = formData.get("stock");
    const isActiveValue = formData.get("isActive");

    const data = createProductSchema.parse({
      categoryId: categoryIdValue ? parseInt(categoryIdValue as string, 10) : null,
      nameFr: formData.get("nameFr") as string,
      nameAr: (formData.get("nameAr") as string) || null,
      descriptionFr: (formData.get("descriptionFr") as string) || null,
      descriptionAr: (formData.get("descriptionAr") as string) || null,
      price: priceValue ? parseFloat(priceValue as string) : 0,
      stock: stockValue ? parseInt(stockValue as string, 10) : 0,
      imageUrl: (formData.get("imageUrl") as string) || null,
      isActive: isActiveValue === "on" || isActiveValue === "true",
    });

    const publicationRequested = data.isActive === true;
    const teamId = await requireTeamId();
    const productService = new ProductService();
    const product = await productService.create({ ...data, isActive: false }, teamId);

    await new AuditLogService().create({
      userId: access.userId,
      action: "CREATE",
      entity: "Product",
      entityId: String(product.id),
      after: product,
    });

    let message = "Produit créé avec succès";
    if (publicationRequested) {
      const result = await approvalService.submitPublication(
        "CLUB_PRODUCT",
        String(product.id),
        teamId,
        access.userId,
      );
      message = result.message;
    }

    revalidateProducts();
    return { success: true, message };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

/** Met à jour un produit de la boutique — réservé à l'admin du club. */
export async function updateProduct(id: number, formData: FormData) {
  try {
    const access = await getUserAccess();
    if (!access.isClubAdmin) {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const categoryIdValue = formData.get("categoryId");
    const priceValue = formData.get("price");
    const stockValue = formData.get("stock");
    const isActiveValue = formData.get("isActive");

    const data = updateProductSchema.parse({
      categoryId: categoryIdValue ? parseInt(categoryIdValue as string, 10) : null,
      nameFr: (formData.get("nameFr") as string) || undefined,
      nameAr: (formData.get("nameAr") as string) || null,
      descriptionFr: (formData.get("descriptionFr") as string) || null,
      descriptionAr: (formData.get("descriptionAr") as string) || null,
      price: priceValue !== null ? parseFloat(priceValue as string) : undefined,
      stock: stockValue !== null ? parseInt(stockValue as string, 10) : undefined,
      imageUrl: (formData.get("imageUrl") as string) || null,
      isActive: isActiveValue === "on" || isActiveValue === "true",
    });

    const teamId = await requireTeamId();
    const productService = new ProductService();
    const before = await productService.findById(id, teamId);
    if (!before) throw new Error("Produit non trouvé");

    const requestedActive = data.isActive === true;
    const sensitiveChanged =
      (data.categoryId !== undefined && data.categoryId !== before.categoryId) ||
      (data.nameFr !== undefined && data.nameFr !== before.nameFr) ||
      (data.nameAr !== undefined && data.nameAr !== before.nameAr) ||
      (data.descriptionFr !== undefined && data.descriptionFr !== before.descriptionFr) ||
      (data.descriptionAr !== undefined && data.descriptionAr !== before.descriptionAr) ||
      (data.price !== undefined && Number(data.price) !== Number(before.price)) ||
      (data.imageUrl !== undefined && data.imageUrl !== before.imageUrl);

    const settings = await approvalService.getSettings(teamId);
    const requiresApproval =
      requestedActive &&
      (!before.isActive || (sensitiveChanged && settings.shopProductReapprovalOnSensitiveChange));

    const product = await productService.update(id, teamId, {
      ...data,
      ...(requiresApproval ? { isActive: false } : {}),
    });

    await new AuditLogService().create({
      userId: access.userId,
      action: "UPDATE",
      entity: "Product",
      entityId: String(id),
      before,
      after: product,
    });

    let message = "Produit modifié avec succès";
    if (requiresApproval) {
      const result = await approvalService.submitPublication(
        "CLUB_PRODUCT",
        String(id),
        teamId,
        access.userId,
      );
      message = result.message;
    }

    revalidateProducts();
    return { success: true, message };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

/** Supprime un produit de la boutique — réservé à l'admin du club. */
export async function deleteProduct(id: number) {
  try {
    const access = await getUserAccess();
    if (!access.isClubAdmin) {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const productService = new ProductService();
    const before = await productService.findById(id, teamId);
    await productService.delete(id, teamId);

    await new AuditLogService().create({
      userId: access.userId,
      action: "DELETE",
      entity: "Product",
      entityId: String(id),
      before: before ?? undefined,
    });

    revalidateProducts();
    return { success: true, message: "Produit supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
