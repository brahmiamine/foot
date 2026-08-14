"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { SuspensionService } from "@/services/SuspensionService";
import { AuditLogService } from "@/services/AuditLogService";

const purgeSchema = z.object({
  matchesPurged: z.number().int().min(0).optional(),
  status: z.enum(["ACTIVE", "PURGED", "CANCELLED"]).optional(),
  disciplinaryDecision: z.enum(["CONFIRMED", "MODIFIED", "CANCELLED_BY_COMMISSION"]).optional(),
  overrideMatchesCount: z.number().int().min(0).optional(),
});

/** Met à jour une suspension (matchs purgés, décision de la commission) — réservé ADMIN. */
export async function updateSuspension(id: string, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const matchesPurgedStr = formData.get("matchesPurged") as string;
    const overrideStr = formData.get("overrideMatchesCount") as string;

    const data = purgeSchema.parse({
      matchesPurged: matchesPurgedStr ? parseInt(matchesPurgedStr, 10) : undefined,
      status: (formData.get("status") as string) || undefined,
      disciplinaryDecision: (formData.get("disciplinaryDecision") as string) || undefined,
      overrideMatchesCount: overrideStr ? parseInt(overrideStr, 10) : undefined,
    });

    const teamId = await requireTeamId();
    const suspensionService = new SuspensionService();
    const { before, after } = await suspensionService.updatePurge(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Suspension",
      entityId: id,
      before,
      after,
    });

    revalidatePath("/admin/suspensions");
    revalidatePath("/admin/cards");
    return { success: true, message: "Suspension mise à jour avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la mise à jour" };
  }
}
