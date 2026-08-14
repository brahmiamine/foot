"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { ProductService } from "@/services/ProductService";
import { AuditLogService } from "@/services/AuditLogService";
import { createProductSchema, updateProductSchema } from "@/types/products";

/** Crée un produit de la boutique du club — réservé ADMIN. */
export async function createProduct(formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
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

    const teamId = await requireTeamId();
    const productService = new ProductService();
    const product = await productService.create(data, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "Product",
      entityId: String(product.id),
      after: product,
    });

    revalidatePath("/admin/shop/products");
    return { success: true, message: "Produit créé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

/** Met à jour un produit de la boutique — réservé ADMIN. */
export async function updateProduct(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
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
    const product = await productService.update(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Product",
      entityId: String(id),
      before: before ?? undefined,
      after: product,
    });

    revalidatePath("/admin/shop/products");
    return { success: true, message: "Produit modifié avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

/** Supprime un produit de la boutique — réservé ADMIN. */
export async function deleteProduct(id: number) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const productService = new ProductService();
    const before = await productService.findById(id, teamId);
    await productService.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "Product",
      entityId: String(id),
      before: before ?? undefined,
    });

    revalidatePath("/admin/shop/products");
    return { success: true, message: "Produit supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
