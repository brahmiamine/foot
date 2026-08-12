"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { MarketplaceModerationService } from "@/services/MarketplaceModerationService";
import { AuditLogService } from "@/services/AuditLogService";
import { MarketplaceProductStatus } from "@/entities/marketplaceEnums";

type ActionResult = { success: true; message: string } | { success: false; error: string };

async function moderate(
  id: string,
  nextStatus: MarketplaceProductStatus,
  rejectionReason?: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Non authentifié" };
    }

    const access = await getUserAccess();
    requirePermission(access, "marketplace.moderate");

    const teamId = await requireTeamId();
    const service = new MarketplaceModerationService();
    const { before, after } = await service.transition(id, teamId, session.user.id, nextStatus, rejectionReason);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "MarketplaceProduct",
      entityId: id,
      before: { status: before.status, rejectionReason: before.rejectionReason },
      after: { status: after.status, rejectionReason: after.rejectionReason, reviewedBy: after.reviewedBy, reviewedAt: after.reviewedAt },
    });

    revalidatePath("/admin/marketplace/products");
    return { success: true, message: "Produit mis à jour" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modération" };
  }
}

/** SUBMITTED → UNDER_REVIEW (US-08) — réservé aux comptes ayant la permission marketplace.moderate. */
export async function reviewProduct(id: string): Promise<ActionResult> {
  return moderate(id, MarketplaceProductStatus.UNDER_REVIEW);
}

/** UNDER_REVIEW → APPROVED (US-09). */
export async function approveProduct(id: string): Promise<ActionResult> {
  return moderate(id, MarketplaceProductStatus.APPROVED);
}

/** APPROVED → PUBLISHED (US-09, publication effective au catalogue). */
export async function publishProduct(id: string): Promise<ActionResult> {
  return moderate(id, MarketplaceProductStatus.PUBLISHED);
}

/** UNDER_REVIEW → REJECTED, motif obligatoire (US-10). */
export async function rejectProduct(id: string, formData: FormData): Promise<ActionResult> {
  const rejectionReason = (formData.get("rejectionReason") as string) || "";
  return moderate(id, MarketplaceProductStatus.REJECTED, rejectionReason);
}
