"use server";

import { revalidatePath } from "next/cache";
import { requireRequestSession } from "@/lib/requestSession";
import { AssignmentWorkflowService } from "@/services/AssignmentWorkflowService";

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
