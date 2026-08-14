"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { SettingsService } from "@/services/SettingsService";
import { AuditLogService } from "@/services/AuditLogService";

const settingsSchema = z.object({
  yellowsBeforeSuspend: z.number().int().min(1).max(10),
  redCard1Matches: z.number().int().min(1).max(10),
  redCard2Matches: z.number().int().min(1).max(10),
  redCard3Matches: z.number().int().min(1).max(10),
  yellowFineAmount: z.number().min(0),
  redFineAmount: z.number().min(0),
  fineDueDays: z.number().int().min(1),
  alertEmails: z.string(),
});

/**
 * Met à jour les réglages disciplinaires globaux (règlement FTF, communs à
 * tous les clubs) — réservé ADMIN.
 */
export async function updateSettings(formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = settingsSchema.parse({
      yellowsBeforeSuspend: parseInt(formData.get("yellowsBeforeSuspend") as string, 10),
      redCard1Matches: parseInt(formData.get("redCard1Matches") as string, 10),
      redCard2Matches: parseInt(formData.get("redCard2Matches") as string, 10),
      redCard3Matches: parseInt(formData.get("redCard3Matches") as string, 10),
      yellowFineAmount: parseFloat(formData.get("yellowFineAmount") as string),
      redFineAmount: parseFloat(formData.get("redFineAmount") as string),
      fineDueDays: parseInt(formData.get("fineDueDays") as string, 10),
      alertEmails: (formData.get("alertEmails") as string) ?? "",
    });

    const settingsService = new SettingsService();
    const { before, after } = await settingsService.update(data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: before ? "UPDATE" : "CREATE",
      entity: "Settings",
      entityId: after.id,
      before: before ?? undefined,
      after,
    });

    revalidatePath("/admin/settings");
    return { success: true, message: "Réglages enregistrés avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}
