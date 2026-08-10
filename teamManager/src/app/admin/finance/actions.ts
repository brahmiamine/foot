"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { FinanceService } from "@/services/FinanceService";
import { createFeePlanSchema, assignFeeSchema, recordPaymentSchema } from "@/types/finance";

export async function createFeePlan(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "finance.manage");

    const data = createFeePlanSchema.parse({
      name: formData.get("name") as string,
      amount: formData.get("amount") as string,
      seasonId: formData.get("seasonId") ? parseInt(formData.get("seasonId") as string, 10) : null,
      category: (formData.get("category") as string) || null,
      description: (formData.get("description") as string) || null,
    });

    const service = new FinanceService();
    await service.createPlan({ ...data, amount: String(data.amount) }, teamId);

    revalidatePath("/admin/finance");
    return { success: true, message: "Modèle de cotisation créé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function deleteFeePlan(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "finance.manage");

    const service = new FinanceService();
    await service.deletePlan(id, teamId);

    revalidatePath("/admin/finance");
    return { success: true, message: "Modèle supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

export async function assignFee(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "finance.manage");

    const data = assignFeeSchema.parse({
      playerId: formData.get("playerId") as string,
      feePlanId: formData.get("feePlanId") ? parseInt(formData.get("feePlanId") as string, 10) : null,
      label: formData.get("label") as string,
      amountDue: formData.get("amountDue") as string,
      dueDate: (formData.get("dueDate") as string) || null,
    });

    const service = new FinanceService();
    await service.assignFee({ ...data, amountDue: String(data.amountDue) }, teamId);

    revalidatePath("/admin/finance");
    return { success: true, message: "Cotisation assignée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'assignation" };
  }
}

export async function setFeeWaived(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "finance.manage");

    const service = new FinanceService();
    await service.setWaived(id, teamId);

    revalidatePath("/admin/finance");
    return { success: true, message: "Cotisation exonérée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur" };
  }
}

export async function deleteFee(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "finance.manage");

    const service = new FinanceService();
    await service.deleteFee(id, teamId);

    revalidatePath("/admin/finance");
    return { success: true, message: "Cotisation supprimée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

export async function recordPayment(playerFeeId: number, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "finance.manage");

    const data = recordPaymentSchema.parse({
      amount: formData.get("amount") as string,
      method: (formData.get("method") as string) || "CASH",
      paidAt: (formData.get("paidAt") as string) || null,
      notes: (formData.get("notes") as string) || null,
    });

    const service = new FinanceService();
    await service.recordPayment(
      playerFeeId,
      teamId,
      { amount: String(data.amount), method: data.method, paidAt: data.paidAt ? new Date(data.paidAt) : undefined, notes: data.notes },
      session.user.id
    );

    revalidatePath("/admin/finance");
    return { success: true, message: "Paiement enregistré" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}

export async function deletePayment(id: number, playerFeeId: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "finance.manage");

    const service = new FinanceService();
    await service.deletePayment(id, playerFeeId, teamId);

    revalidatePath("/admin/finance");
    return { success: true, message: "Paiement supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
