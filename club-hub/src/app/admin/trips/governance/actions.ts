"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getUserAccess, requireCategory, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { TripService } from "@/services/TripService";
import { TripWorkflowService } from "@/services/TripWorkflowService";
import { TripGovernanceQueryService } from "@/services/TripGovernanceQueryService";
import {
  cancelTripSchema,
  submitTripBudgetSchema,
  tripConsentSchema,
  tripDecisionReasonSchema,
  tripExpenseSchema,
  tripGovernanceSettingsSchema,
} from "@/types/trips";

function revalidateTrips() {
  revalidatePath("/admin/trips");
  revalidatePath("/admin/trips/governance");
}

async function baseContext(permission: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Non authentifié");
  const access = await getUserAccess();
  requirePermission(access, permission);
  const teamId = await requireTeamId();
  if (access.teamId !== teamId) throw new Error("Action non autorisée : contexte club incohérent");
  return { userId: session.user.id, access, teamId };
}

async function tripContext(tripId: number, permission: string) {
  const context = await baseContext(permission);
  const trip = await new TripService().findById(tripId, context.teamId);
  if (!trip) throw new Error("Déplacement non trouvé");
  requireCategory(context.access, trip.category);
  return { ...context, trip };
}

export async function updateTripGovernanceSettings(formData: FormData) {
  try {
    const context = await baseContext("trips.approve");
    const input = tripGovernanceSettingsSchema.parse({
      dualApprovalThreshold: formData.get("dualApprovalThreshold"),
      receiptRequiredThreshold: formData.get("receiptRequiredThreshold"),
    });
    await new TripWorkflowService().updateGovernanceSettings(context.teamId, context.userId, input);
    revalidateTrips();
    return { success: true, message: "Seuils de déplacement enregistrés" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de configuration" };
  }
}

export async function submitTripBudget(tripId: number, formData: FormData) {
  try {
    const context = await tripContext(tripId, "trips.manage");
    const input = submitTripBudgetSchema.parse({ estimatedBudget: formData.get("estimatedBudget") });
    await new TripWorkflowService().submitBudget(tripId, context.teamId, context.userId, input.estimatedBudget);
    revalidateTrips();
    return { success: true, message: "Budget soumis à approbation" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de soumission" };
  }
}

export async function approveTripBudget(approvalId: string) {
  try {
    const context = await baseContext("trips.approve");
    const approvalContext = await new TripGovernanceQueryService().findApprovalTrip(approvalId, context.teamId);
    if (!approvalContext) throw new Error("Approbation déplacement introuvable");
    requireCategory(context.access, approvalContext.trip.category);
    await new TripWorkflowService().approveBudget(approvalId, context.teamId, context.userId);
    revalidateTrips();
    return { success: true, message: "Approbation enregistrée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur d'approbation" };
  }
}

export async function rejectTripBudget(approvalId: string, formData: FormData) {
  try {
    const context = await baseContext("trips.approve");
    const approvalContext = await new TripGovernanceQueryService().findApprovalTrip(approvalId, context.teamId);
    if (!approvalContext) throw new Error("Approbation déplacement introuvable");
    requireCategory(context.access, approvalContext.trip.category);
    const input = tripDecisionReasonSchema.parse({ reason: formData.get("reason") });
    await new TripWorkflowService().rejectBudget(approvalId, context.teamId, context.userId, input.reason);
    revalidateTrips();
    return { success: true, message: "Budget rejeté" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de rejet" };
  }
}

export async function recordTripConsent(tripId: number, participantId: number, formData: FormData) {
  try {
    const context = await tripContext(tripId, "trips.manage");
    const input = tripConsentSchema.parse({
      granted: formData.get("granted"),
      note: (formData.get("note") as string | null) || null,
    });
    await new TripWorkflowService().recordConsent(
      participantId,
      context.teamId,
      context.userId,
      input.granted,
      input.note,
    );
    revalidateTrips();
    return { success: true, message: input.granted ? "Consentement enregistré" : "Refus de consentement enregistré" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de consentement" };
  }
}

export async function markTripReady(tripId: number) {
  try {
    const context = await tripContext(tripId, "trips.manage");
    await new TripWorkflowService().markReady(tripId, context.teamId, context.userId);
    revalidateTrips();
    return { success: true, message: "Déplacement prêt" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Impossible de passer READY" };
  }
}

export async function markTripDeparted(tripId: number) {
  try {
    const context = await tripContext(tripId, "trips.manage");
    await new TripWorkflowService().markDeparted(tripId, context.teamId, context.userId);
    revalidateTrips();
    return { success: true, message: "Départ enregistré" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Impossible d'enregistrer le départ" };
  }
}

export async function addTripExpense(tripId: number, formData: FormData) {
  try {
    const context = await tripContext(tripId, "trips.manage");
    const input = tripExpenseSchema.parse({
      label: formData.get("label"),
      amount: formData.get("amount"),
      documentUrl: (formData.get("documentUrl") as string | null) || "",
    });
    await new TripWorkflowService().addExpense(tripId, context.teamId, context.userId, input);
    revalidateTrips();
    return { success: true, message: "Dépense enregistrée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement de la dépense" };
  }
}

export async function removeTripExpense(tripId: number, expenseId: string) {
  try {
    const context = await tripContext(tripId, "trips.manage");
    await new TripWorkflowService().removeExpense(expenseId, tripId, context.teamId, context.userId);
    revalidateTrips();
    return { success: true, message: "Dépense supprimée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

export async function completeTrip(tripId: number) {
  try {
    const context = await tripContext(tripId, "trips.manage");
    await new TripWorkflowService().completeTrip(tripId, context.teamId, context.userId);
    revalidateTrips();
    return { success: true, message: "Déplacement clôturé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Impossible de clôturer le déplacement" };
  }
}

export async function cancelTrip(tripId: number, formData: FormData) {
  try {
    const context = await tripContext(tripId, "trips.manage");
    const input = cancelTripSchema.parse({ reason: formData.get("reason") });
    await new TripWorkflowService().cancelTrip(tripId, context.teamId, context.userId, input.reason);
    revalidateTrips();
    return { success: true, message: "Déplacement annulé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Impossible d'annuler le déplacement" };
  }
}
