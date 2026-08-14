"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { FineService } from "@/services/FineService";
import { AuditLogService } from "@/services/AuditLogService";
import { getDataSource } from "@/lib/database";
import { Player } from "@/entities/Player";

const createFineSchema = z.object({
  type: z.enum(["CARD", "VIRAGE", "DIRECTOR", "DISCIPLINARY"]),
  amount: z.number().min(0.001),
  reasonFr: z.string().min(1),
  reasonAr: z.string().optional(),
  playerId: z.string().optional(),
  directorNameFr: z.string().optional(),
  directorNameAr: z.string().optional(),
  dueDate: z.string().optional(),
});

const updateFineSchema = z.object({
  status: z.enum(["PENDING", "PAID", "OVERDUE"]).optional(),
  paidAt: z.string().nullable().optional(),
  amount: z.number().optional(),
  reasonFr: z.string().optional(),
  reasonAr: z.string().optional(),
  dueDate: z.string().optional(),
});

/** Crée une amende (carton, virage, dirigeant ou disciplinaire) — réservé ADMIN. */
export async function createFine(formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const amountStr = formData.get("amount") as string;
    const data = createFineSchema.parse({
      type: formData.get("type") as string,
      amount: parseFloat(amountStr),
      reasonFr: formData.get("reasonFr") as string,
      reasonAr: (formData.get("reasonAr") as string) || undefined,
      playerId: (formData.get("playerId") as string) || undefined,
      directorNameFr: (formData.get("directorNameFr") as string) || undefined,
      directorNameAr: (formData.get("directorNameAr") as string) || undefined,
      dueDate: (formData.get("dueDate") as string) || undefined,
    });

    const teamId = await requireTeamId();

    // teamId dérivé du joueur (et vérifié) pour une amende carton, ou de la
    // session directement pour VIRAGE/DIRECTOR/DISCIPLINARY (pas de joueur).
    let effectiveTeamId: string | null = teamId;
    if (data.playerId) {
      const dataSource = await getDataSource();
      const player = await dataSource.getRepository(Player).findOne({ where: { id: data.playerId } });
      if (!player || player.teamId !== teamId) {
        return { success: false, error: "Joueur introuvable pour ce club" };
      }
      effectiveTeamId = player.teamId;
    }

    const fineService = new FineService();
    const fine = await fineService.create(data, effectiveTeamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "Fine",
      entityId: fine.id,
      after: fine,
    });

    revalidatePath("/admin/fines");
    return { success: true, message: "Amende créée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

/** Met à jour une amende (statut, paiement...) — réservé ADMIN. Débloque le joueur si PAID. */
export async function updateFine(id: string, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const amountStr = formData.get("amount") as string;
    const paidAtValue = formData.get("paidAt");

    const data = updateFineSchema.parse({
      status: (formData.get("status") as string) || undefined,
      paidAt: paidAtValue === "" ? null : ((paidAtValue as string) ?? undefined),
      amount: amountStr ? parseFloat(amountStr) : undefined,
      reasonFr: (formData.get("reasonFr") as string) || undefined,
      reasonAr: (formData.get("reasonAr") as string) || undefined,
      dueDate: (formData.get("dueDate") as string) || undefined,
    });

    const teamId = await requireTeamId();
    const fineService = new FineService();
    const { before, after } = await fineService.update(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Fine",
      entityId: id,
      before,
      after,
    });

    revalidatePath("/admin/fines");
    return { success: true, message: "Amende mise à jour avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la mise à jour" };
  }
}

/** Supprime une amende — réservé ADMIN. */
export async function deleteFine(id: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const fineService = new FineService();
    const fine = await fineService.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "Fine",
      entityId: id,
      before: fine,
    });

    revalidatePath("/admin/fines");
    return { success: true, message: "Amende supprimée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
