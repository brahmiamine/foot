"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { AuditLogService } from "@/services/AuditLogService";
import {
  approveProduct as apiApproveProduct,
  publishProduct as apiPublishProduct,
  rejectProduct as apiRejectProduct,
  reviewProduct as apiReviewProduct,
  type MarketplaceProduct,
} from "@/lib/marketplaceApiClient";

type ActionResult = { success: true; message: string } | { success: false; error: string };
type ModerationAction = "review" | "approve" | "publish" | "reject";

/**
 * Appelle marketplace-api pour la transition demandée (voir
 * src/lib/marketplaceApiClient.ts) — teamManager n'accède plus directement
 * à `sp_products`/`sp_sellers` (voir avancement.md, TS-04). L'audit reste
 * local à teamManager (AuditLog), marketplace-api n'a pas connaissance des
 * comptes User teamManager.
 */
async function moderate(id: string, action: ModerationAction, rejectionReason?: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Non authentifié" };
    }

    const access = await getUserAccess();
    requirePermission(access, "marketplace.moderate");

    const teamId = await requireTeamId();
    const actorId = session.user.id;

    let after: MarketplaceProduct;
    switch (action) {
      case "review":
        after = await apiReviewProduct(id, teamId, actorId);
        break;
      case "approve":
        after = await apiApproveProduct(id, teamId, actorId);
        break;
      case "publish":
        after = await apiPublishProduct(id, teamId, actorId);
        break;
      case "reject":
        after = await apiRejectProduct(id, teamId, actorId, rejectionReason ?? "");
        break;
    }

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: actorId,
      action: "UPDATE",
      entity: "MarketplaceProduct",
      entityId: id,
      after: {
        transition: action,
        status: after.status,
        rejectionReason: after.rejectionReason,
        reviewedBy: after.reviewedBy,
        reviewedAt: after.reviewedAt,
      },
    });

    revalidatePath("/admin/marketplace/products");
    return { success: true, message: "Produit mis à jour" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modération" };
  }
}

/** SUBMITTED → UNDER_REVIEW (US-08) — réservé aux comptes ayant la permission marketplace.moderate. */
export async function reviewProduct(id: string): Promise<ActionResult> {
  return moderate(id, "review");
}

/** UNDER_REVIEW → APPROVED (US-09). */
export async function approveProduct(id: string): Promise<ActionResult> {
  return moderate(id, "approve");
}

/** APPROVED → PUBLISHED (US-09, publication effective au catalogue). */
export async function publishProduct(id: string): Promise<ActionResult> {
  return moderate(id, "publish");
}

/** UNDER_REVIEW → REJECTED, motif obligatoire (US-10). */
export async function rejectProduct(id: string, formData: FormData): Promise<ActionResult> {
  const rejectionReason = (formData.get("rejectionReason") as string) || "";
  return moderate(id, "reject", rejectionReason);
}
