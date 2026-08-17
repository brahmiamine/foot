"use server";

import { revalidatePath } from "next/cache";
import { getCompetitionAdminPageSession } from "@/lib/adminAuth";
import {
  resolveRefereeReplacementRequest,
  reviewRefereeReplacementRequest,
} from "@/lib/refereeReplacementRequests";

async function requireSession() {
  const session = await getCompetitionAdminPageSession();
  if (!session) throw new Error("Non autorisé");
  return session;
}

function revalidateQueue() {
  revalidatePath("/admin/arbitrage/remplacements");
}

export async function approveReplacementRequestAction(requestId: number, formData: FormData): Promise<void> {
  const session = await requireSession();
  const note = String(formData.get("note") ?? "");
  await reviewRefereeReplacementRequest(session, requestId, "APPROVED", note);
  revalidateQueue();
}

export async function rejectReplacementRequestAction(requestId: number, formData: FormData): Promise<void> {
  const session = await requireSession();
  const note = String(formData.get("note") ?? "");
  await reviewRefereeReplacementRequest(session, requestId, "REJECTED", note);
  revalidateQueue();
}

export async function resolveReplacementRequestAction(requestId: number, formData: FormData): Promise<void> {
  const session = await requireSession();
  const assignmentId = Number(formData.get("replacementAssignmentId"));
  await resolveRefereeReplacementRequest(session, requestId, assignmentId);
  revalidateQueue();
}
