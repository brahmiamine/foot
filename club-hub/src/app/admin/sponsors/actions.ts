"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getUserAccess, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { SponsorshipWorkflowService } from "@/services/SponsorshipWorkflowService";
import {
  sponsorContractDraftSchema,
  sponsorshipGovernanceSchema,
  sponsorRejectionSchema,
  sponsorWorkflowNoteSchema,
} from "@/types/sponsors";

const PATH = "/admin/sponsors";

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  sponsorId?: number;
  approvalId?: string;
}

async function context() {
  const session = await auth();
  if (!session?.user) throw new Error("Non authentifié");

  const access = await getUserAccess();
  requirePermission(access, "sponsors.manage");
  const teamId = await requireTeamId();
  if (access.teamId !== teamId) throw new Error("Action non autorisée : contexte club incohérent");

  return { teamId, actorUserId: session.user.id, workflow: new SponsorshipWorkflowService() };
}

function failure(error: unknown, fallback: string): ActionResult {
  return { success: false, error: error instanceof Error ? error.message : fallback };
}

function parseContract(formData: FormData) {
  return sponsorContractDraftSchema.parse({
    level: formData.get("level"),
    logoSize: formData.get("logoSize"),
    logoPlacement: formData.getAll("logoPlacement").filter((value): value is string => typeof value === "string"),
    contractStart: formData.get("contractStart"),
    contractEnd: formData.get("contractEnd"),
    contractAmount: formData.get("contractAmount"),
    notes: formData.get("notes") || null,
  });
}

export async function reviewSponsorRequest(id: number, formData: FormData): Promise<ActionResult> {
  try {
    const data = sponsorWorkflowNoteSchema.parse({ notes: formData.get("notes") || null });
    const { teamId, actorUserId, workflow } = await context();
    await workflow.reviewRequest(id, teamId, actorUserId, data.notes);
    revalidatePath(PATH);
    return { success: true, message: "Demande passée en revue" };
  } catch (error) {
    return failure(error, "Erreur lors de la revue");
  }
}

export async function startSponsorNegotiation(id: number, formData: FormData): Promise<ActionResult> {
  try {
    const data = sponsorWorkflowNoteSchema.parse({ notes: formData.get("notes") || null });
    const { teamId, actorUserId, workflow } = await context();
    await workflow.startNegotiation(id, teamId, actorUserId, data.notes);
    revalidatePath(PATH);
    return { success: true, message: "Négociation démarrée" };
  } catch (error) {
    return failure(error, "Erreur lors du démarrage de la négociation");
  }
}

export async function draftSponsorContract(requestId: number, formData: FormData): Promise<ActionResult> {
  try {
    const data = parseContract(formData);
    const { teamId, actorUserId, workflow } = await context();
    const sponsor = await workflow.draftContract(requestId, teamId, actorUserId, data);
    revalidatePath(PATH);
    return { success: true, message: "Brouillon de contrat créé", sponsorId: sponsor.id };
  } catch (error) {
    return failure(error, "Erreur lors de la création du contrat");
  }
}

export async function updateSponsorContractDraft(sponsorId: number, formData: FormData): Promise<ActionResult> {
  try {
    const data = parseContract(formData);
    const { teamId, actorUserId, workflow } = await context();
    await workflow.updateDraftContract(sponsorId, teamId, actorUserId, data);
    revalidatePath(PATH);
    return { success: true, message: "Brouillon de contrat mis à jour" };
  } catch (error) {
    return failure(error, "Erreur lors de la mise à jour du contrat");
  }
}

export async function submitSponsorContractForApproval(sponsorId: number): Promise<ActionResult> {
  try {
    const { teamId, actorUserId, workflow } = await context();
    const approval = await workflow.submitForApproval(sponsorId, teamId, actorUserId);
    revalidatePath(PATH);
    return {
      success: true,
      message:
        approval.approvalMode === "DUAL_APPROVAL"
          ? "Contrat soumis à double approbation"
          : "Contrat soumis à approbation",
      approvalId: approval.id,
    };
  } catch (error) {
    return failure(error, "Erreur lors de la soumission du contrat");
  }
}

export async function approveSponsorContract(approvalId: string): Promise<ActionResult> {
  try {
    const { teamId, actorUserId, workflow } = await context();
    const approval = await workflow.approveContract(approvalId, teamId, actorUserId);
    revalidatePath(PATH);
    return {
      success: true,
      message: approval.status === "APPROVED" ? "Contrat approuvé" : "Approbation enregistrée",
    };
  } catch (error) {
    return failure(error, "Erreur lors de l'approbation du contrat");
  }
}

export async function rejectSponsorContract(approvalId: string, formData: FormData): Promise<ActionResult> {
  try {
    const data = sponsorRejectionSchema.parse({ reason: formData.get("reason") });
    const { teamId, actorUserId, workflow } = await context();
    await workflow.rejectContract(approvalId, teamId, actorUserId, data.reason);
    revalidatePath(PATH);
    return { success: true, message: "Contrat rejeté et renvoyé en brouillon" };
  } catch (error) {
    return failure(error, "Erreur lors du rejet du contrat");
  }
}

export async function activateSponsor(sponsorId: number): Promise<ActionResult> {
  try {
    const { teamId, actorUserId, workflow } = await context();
    await workflow.activateSponsor(sponsorId, teamId, actorUserId);
    revalidatePath(PATH);
    return { success: true, message: "Sponsor activé" };
  } catch (error) {
    return failure(error, "Erreur lors de l'activation du sponsor");
  }
}

export async function refuseSponsorRequest(id: number, formData: FormData): Promise<ActionResult> {
  try {
    const data = sponsorRejectionSchema.parse({ reason: formData.get("reason") });
    const { teamId, actorUserId, workflow } = await context();
    await workflow.refuseRequest(id, teamId, actorUserId, data.reason);
    revalidatePath(PATH);
    return { success: true, message: "Demande de sponsoring refusée" };
  } catch (error) {
    return failure(error, "Erreur lors du refus de la demande");
  }
}

export async function deleteSponsorRequest(id: number): Promise<ActionResult> {
  try {
    const { teamId, workflow } = await context();
    await workflow.deletePendingRequest(id, teamId);
    revalidatePath(PATH);
    return { success: true, message: "Demande supprimée" };
  } catch (error) {
    return failure(error, "Erreur lors de la suppression de la demande");
  }
}

export async function updateSponsorshipGovernance(formData: FormData): Promise<ActionResult> {
  try {
    const data = sponsorshipGovernanceSchema.parse({
      dualApprovalThreshold: formData.get("dualApprovalThreshold"),
    });
    const { teamId, actorUserId, workflow } = await context();
    const settings = await workflow.updateGovernanceSettings(teamId, actorUserId, data.dualApprovalThreshold);
    revalidatePath(PATH);
    return {
      success: true,
      message: `Seuil de double approbation mis à jour (${settings.dualApprovalThreshold.toFixed(3)})`,
    };
  } catch (error) {
    return failure(error, "Erreur lors de la mise à jour de la gouvernance sponsoring");
  }
}
