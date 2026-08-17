"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getUserAccess, requirePermission } from "@/lib/access";
import { medicalPortalService } from "@/services/MedicalPortalService";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notificationApi";
import type {
  InjurySeverity,
  InjuryStatus,
  ReturnToPlayStage,
} from "@/entities/Injury";
import type { InjuryClearanceDecision } from "@/entities/InjuryClearance";

async function requireMedicalWriteAccess() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  const access = await getUserAccess();
  requirePermission(access, "medical.manage");
  return session.user;
}

function revalidateMedical() {
  revalidatePath("/blessures");
  revalidatePath("/indisponibles");
  revalidatePath("/historique");
  revalidatePath("/disponibilites");
  revalidatePath("/");
}

export async function createInjuryAction(data: {
  playerId: string;
  injuryDate: string;
  zone: string;
  severity: InjurySeverity;
  description?: string;
  diagnosis?: string;
  unavailabilityDays?: number;
  expectedReturnDate?: string;
  progressiveReturn?: boolean;
  progressiveReturnNotes?: string;
}) {
  const user = await requireMedicalWriteAccess();
  await medicalPortalService.createInjury({ teamId: user.teamId, createdBy: user.id, ...data });
  revalidateMedical();
}

export async function updateInjuryAction(
  id: number,
  data: Partial<{
    zone: string;
    severity: InjurySeverity;
    description: string | null;
    diagnosis: string | null;
    unavailabilityDays: number | null;
    expectedReturnDate: string | null;
    actualReturnDate: string | null;
    progressiveReturn: boolean;
    progressiveReturnNotes: string | null;
    status: InjuryStatus;
  }>,
) {
  const user = await requireMedicalWriteAccess();
  await medicalPortalService.updateInjury(id, user.teamId, data);
  revalidateMedical();
}

/** Compatibilité UI : le passage final reste soumis au workflow RTP. */
export async function markResolvedAction(id: number, _actualReturnDate: string) {
  const user = await requireMedicalWriteAccess();
  await medicalPortalService.transitionReturnToPlay(id, user.teamId, "AVAILABLE", user.id);
  revalidateMedical();
}

export async function transitionReturnToPlayAction(
  id: number,
  targetStage: ReturnToPlayStage,
  note?: string,
): Promise<void> {
  const user = await requireMedicalWriteAccess();
  await medicalPortalService.transitionReturnToPlay(id, user.teamId, targetStage, user.id, note);
  revalidateMedical();
}

export async function recordClearanceAction(
  id: number,
  decision: InjuryClearanceDecision,
  notes?: string,
): Promise<void> {
  const user = await requireMedicalWriteAccess();
  await medicalPortalService.recordClearance(id, user.teamId, user.id, decision, notes);
  revalidateMedical();
}

export async function updateMedicalSettingsAction(values: {
  clearanceRequired: boolean;
  severeSecondOpinionRequired: boolean;
}): Promise<void> {
  const user = await requireMedicalWriteAccess();
  await medicalPortalService.updateSettings(user.teamId, user.id, values);
  revalidateMedical();
}

export async function appendFollowUpNoteAction(id: number, note: string) {
  const user = await requireMedicalWriteAccess();
  await medicalPortalService.appendFollowUpNote(id, user.teamId, note, user.id);
  revalidatePath("/blessures");
}

export async function addDocumentAction(id: number, name: string, url: string) {
  const user = await requireMedicalWriteAccess();
  await medicalPortalService.addDocument(id, user.teamId, { name, url });
  revalidatePath("/blessures");
  revalidatePath("/documents");
}

export async function markNotificationReadAction(id: string) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  await markNotificationRead(id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  await markAllNotificationsRead();
  revalidatePath("/notifications");
}
