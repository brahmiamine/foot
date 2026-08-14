"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRequestSession } from "@/lib/requestSession";
import { ReportService } from "@/services/ReportService";

export async function saveReportAction(formData: FormData) {
  const session = await requireRequestSession();
  const assignmentId = Number.parseInt(String(formData.get("assignment_id") ?? ""), 10);
  const intent = String(formData.get("intent") ?? "draft");
  try {
    if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) throw new Error("Désignation invalide");
    await new ReportService().saveMine(
      session.id,
      assignmentId,
      String(formData.get("subject") ?? ""),
      String(formData.get("content") ?? ""),
      intent === "submit",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Une erreur est survenue";
    redirect(`/reports/${assignmentId}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/reports");
  revalidatePath(`/reports/${assignmentId}`);
  redirect(`/reports/${assignmentId}?success=${intent === "submit" ? "submitted" : "draft"}`);
}
