"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { ShopOrderService } from "@/services/ShopOrderService";
import { createOrderSchema, ORDER_STATUSES } from "@/types/orders";

export async function createOrder(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "orders.manage");

    const productIds = formData.getAll("productId") as string[];
    const quantities = formData.getAll("quantity") as string[];
    const items = productIds
      .map((productId, idx) => ({ productId: parseInt(productId, 10), quantity: parseInt(quantities[idx] ?? "0", 10) }))
      .filter((i) => i.productId && i.quantity > 0);

    const data = createOrderSchema.parse({
      userId: (formData.get("userId") as string) || null,
      customerName: (formData.get("customerName") as string) || null,
      customerPhone: (formData.get("customerPhone") as string) || null,
      notes: (formData.get("notes") as string) || null,
      items,
    });

    const service = new ShopOrderService();
    await service.create(data, teamId);

    revalidatePath("/admin/orders");
    return { success: true, message: "Commande créée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function setOrderStatus(id: number, status: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "orders.manage");

    if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
      throw new Error("Statut invalide");
    }

    const service = new ShopOrderService();
    await service.setStatus(id, teamId, status as (typeof ORDER_STATUSES)[number]);

    revalidatePath("/admin/orders");
    return { success: true, message: "Statut mis à jour" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur" };
  }
}

export async function deleteOrder(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "orders.manage");

    const service = new ShopOrderService();
    await service.delete(id, teamId);

    revalidatePath("/admin/orders");
    return { success: true, message: "Commande supprimée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
