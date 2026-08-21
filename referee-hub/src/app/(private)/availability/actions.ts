"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRequestSession } from "@/lib/requestSession";
import { AvailabilityService } from "@/services/AvailabilityService";
import type { UnavailabilityReasonCategory } from "@/entities/RefereeUnavailability";

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue";
}

const REASON_CATEGORIES: UnavailabilityReasonCategory[] = ["MEDICAL", "PROFESSIONAL", "PERSONAL", "OTHER"];

export async function createUnavailabilityAction(formData: FormData) {
  const session = await requireRequestSession();
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const reasonCategoryRaw = String(formData.get("reason_category") ?? "OTHER");
  const reasonCategory = REASON_CATEGORIES.includes(reasonCategoryRaw as UnavailabilityReasonCategory)
    ? (reasonCategoryRaw as UnavailabilityReasonCategory)
    : "OTHER";
  const proofDocumentUrl = String(formData.get("proof_document_url") ?? "") || null;
  const recurrenceDaysRaw = formData.getAll("recurrence_days_of_week").map(String);
  const recurrenceDaysOfWeek = recurrenceDaysRaw.length
    ? recurrenceDaysRaw.map((value) => Number.parseInt(value, 10)).filter((value) => Number.isInteger(value))
    : null;
  const recurrenceEndDate = String(formData.get("recurrence_end_date") ?? "") || null;
  try {
    await new AvailabilityService().createMine(session.id, {
      startDate,
      endDate,
      reason,
      reasonCategory,
      proofDocumentUrl,
      recurrenceDaysOfWeek,
      recurrenceEndDate,
    });
  } catch (error) {
    redirect(`/availability?error=${encodeURIComponent(message(error))}`);
  }
  revalidatePath("/availability");
  redirect("/availability?success=created");
}

export async function cancelUnavailabilityAction(formData: FormData) {
  const session = await requireRequestSession();
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  try {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Identifiant invalide");
    await new AvailabilityService().cancelMine(session.id, id);
  } catch (error) {
    redirect(`/availability?error=${encodeURIComponent(message(error))}`);
  }
  revalidatePath("/availability");
  redirect("/availability?success=cancelled");
}
