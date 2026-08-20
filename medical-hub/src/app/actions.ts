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
import type { AgeCategory } from "@/types/categories";

type MedicalCategoryScope = "ALL" | AgeCategory[];

async function requireMedicalWriteAccess(permission: string) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  const access = await getUserAccess();
  requirePermission(access, permission);
  return { user: session.user, access };
}

async function requirePlayerInCategoryScope(
  teamId: string,
  playerId: string,
  categories: MedicalCategoryScope,
): Promise<void> {
  if (categories === "ALL") return;
  const roster = await medicalPortalService.rosterInCategories(teamId, categories);
  if (!roster.some((player) => player.id === playerId)) {
    throw new Error("Action non autorisée : catégorie hors de votre périmètre");
  }
}

async function requireInjuryInCategoryScope(
  teamId: string,
  injuryId: number,
  categories: MedicalCategoryScope,
): Promise<void> {
  if (categories === "ALL") return;
  const injury = await medicalPortalService.getInjury(injuryId, teamId);
  if (!injury) throw new Error("Blessure introuvable");
  await requirePlayerInCategoryScope(teamId, injury.playerId, categories);
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
  const { user, access } = await requireMedicalWriteAccess("medical.injuries.manage");
  await requirePlayerInCategoryScope(user.teamId, data.playerId, access.categories);
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
  const { user, access } = await requireMedicalWriteAccess("medical.injuries.manage");
  await requireInjuryInCategoryScope(user.teamId, id, access.categories);
  await medicalPortalService.updateInjury(id, user.teamId, data);
  revalidateMedical();
}

/** Compatibilité UI : le passage final reste soumis au workflow RTP. */
export async function markResolvedAction(id: number, _actualReturnDate: string) {
  const { user, access } = await requireMedicalWriteAccess("medical.rtp.manage");
  await requireInjuryInCategoryScope(user.teamId, id, access.categories);
  await medicalPortalService.transitionReturnToPlay(id, user.teamId, "AVAILABLE", user.id);
  revalidateMedical();
}

export async function transitionReturnToPlayAction(
  id: number,
  targetStage: ReturnToPlayStage,
  note?: string,
): Promise<void> {
  const { user, access } = await requireMedicalWriteAccess("medical.rtp.manage");
  await requireInjuryInCategoryScope(user.teamId, id, access.categories);
  await medicalPortalService.transitionReturnToPlay(id, user.teamId, targetStage, user.id, note);
  revalidateMedical();
}

export async function recordClearanceAction(
  id: number,
  decision: InjuryClearanceDecision,
  notes?: string,
): Promise<void> {
  const { user, access } = await requireMedicalWriteAccess("medical.clearance.manage");
  await requireInjuryInCategoryScope(user.teamId, id, access.categories);
  await medicalPortalService.recordClearance(id, user.teamId, user.id, decision, notes);
  revalidateMedical();
}

export async function updateMedicalSettingsAction(values: {
  clearanceRequired: boolean;
  severeSecondOpinionRequired: boolean;
}): Promise<void> {
  const { user, access } = await requireMedicalWriteAccess("medical.settings.manage");
  if (access.categories !== "ALL") {
    throw new Error("Action non autorisée : la configuration médicale exige une portée globale");
  }
  await medicalPortalService.updateSettings(user.teamId, user.id, values);
  revalidateMedical();
}

export async function appendFollowUpNoteAction(id: number, note: string) {
  const { user, access } = await requireMedicalWriteAccess("medical.followups.manage");
  await requireInjuryInCategoryScope(user.teamId, id, access.categories);
  await medicalPortalService.appendFollowUpNote(id, user.teamId, note, user.id);
  revalidatePath("/blessures");
}

export async function addDocumentAction(id: number, name: string, url: string) {
  const { user, access } = await requireMedicalWriteAccess("medical.documents.manage");
  await requireInjuryInCategoryScope(user.teamId, id, access.categories);
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
