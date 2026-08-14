"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getUserAccess, requirePermission } from "@/lib/access";
import { medicalPortalService } from "@/services/MedicalPortalService";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notificationApi";
import type { InjurySeverity, InjuryStatus } from "@/entities/Injury";

async function requireMedicalWriteAccess() {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  const access = await getUserAccess();
  requirePermission(access, "medical.manage");
  return session.user;
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
  revalidatePath("/blessures");
  revalidatePath("/indisponibles");
  revalidatePath("/");
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
  }>
) {
  const user = await requireMedicalWriteAccess();
  await medicalPortalService.updateInjury(id, user.teamId, data);
  revalidatePath("/blessures");
  revalidatePath("/indisponibles");
  revalidatePath("/historique");
  revalidatePath("/");
}

export async function markResolvedAction(id: number, actualReturnDate: string) {
  const user = await requireMedicalWriteAccess();
  await medicalPortalService.updateInjury(id, user.teamId, { status: "RESOLVED", actualReturnDate });
  revalidatePath("/blessures");
  revalidatePath("/indisponibles");
  revalidatePath("/historique");
  revalidatePath("/");
}

export async function appendFollowUpNoteAction(id: number, note: string) {
  const user = await requireMedicalWriteAccess();
  await medicalPortalService.appendFollowUpNote(id, user.teamId, note, user.name);
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
