"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRequestSession } from "@/lib/requestSession";
import { AvailabilityService } from "@/services/AvailabilityService";

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue";
}

export async function createUnavailabilityAction(formData: FormData) {
  const session = await requireRequestSession();
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const reason = String(formData.get("reason") ?? "");
  try {
    await new AvailabilityService().createMine(session.id, startDate, endDate, reason);
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
