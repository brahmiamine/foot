"use server";

import { revalidatePath } from "next/cache";
import { requireRequestSession } from "@/lib/requestSession";
import { AssignmentWorkflowService } from "@/services/AssignmentWorkflowService";
import { RefereeConflictDeclarationService } from "@/services/RefereeConflictDeclarationService";

function revalidateAssignment(assignmentId: number) {
  revalidatePath("/assignments");
  revalidatePath(`/assignments/${assignmentId}`);
  revalidatePath("/");
}

export async function acceptAssignmentAction(assignmentId: number): Promise<void> {
  const session = await requireRequestSession();
  await new AssignmentWorkflowService().accept(session.id, assignmentId);
  revalidateAssignment(assignmentId);
}

export async function declineAssignmentAction(assignmentId: number, formData: FormData): Promise<void> {
  const session = await requireRequestSession();
  const reason = String(formData.get("reason") ?? "");
  await new AssignmentWorkflowService().decline(session.id, assignmentId, reason);
  revalidateAssignment(assignmentId);
}

export async function requestReplacementAction(assignmentId: number, formData: FormData): Promise<void> {
  const session = await requireRequestSession();
  const reason = String(formData.get("reason") ?? "");
  await new AssignmentWorkflowService().requestReplacement(session.id, assignmentId, reason);
  revalidateAssignment(assignmentId);
}

/** REF-005 — déclaration obligatoire avant toute acceptation de désignation. */
export async function declareConflictAction(assignmentId: number, formData: FormData): Promise<void> {
  const session = await requireRequestSession();
  const hasConflict = String(formData.get("has_conflict") ?? "") === "true";
  const details = String(formData.get("details") ?? "");
  await new RefereeConflictDeclarationService().declare(assignmentId, {
    actorUserId: session.id,
    actorRole: session.role,
    hasConflict,
    details,
  });
  revalidateAssignment(assignmentId);
}
