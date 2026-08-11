"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { TicketControllerService } from "@/services/TicketControllerService";
import { UserService } from "@/services/UserService";
import { AuditLogService } from "@/services/AuditLogService";
import { z } from "zod";

const newControllerSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(191),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "6 caractères minimum"),
  gate: z.string().max(50).optional().nullable(),
});

const assignControllerSchema = z.object({
  userId: z.string().min(1, "Le compte est requis"),
  gate: z.string().max(50).optional().nullable(),
});

/** Crée un nouveau compte OBSERVATEUR et l'attribue directement comme contrôleur. */
export async function createController(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.manageControllers");

    const data = newControllerSchema.parse({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      gate: (formData.get("gate") as string) || null,
    });

    const teamId = await requireTeamId();
    const userService = new UserService();
    const user = await userService.create({ name: data.name, email: data.email, password: data.password }, teamId);

    const controllerService = new TicketControllerService();
    await controllerService.assign(teamId, user.id, data.gate ?? null);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "CREATE", entity: "TicketController", entityId: user.id });

    revalidatePath("/admin/ticketing/controllers");
    return { success: true, message: "Contrôleur créé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

/** Attribue le rôle contrôleur à un compte existant du club. */
export async function assignController(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.manageControllers");

    const data = assignControllerSchema.parse({
      userId: formData.get("userId") as string,
      gate: (formData.get("gate") as string) || null,
    });

    const teamId = await requireTeamId();
    const controllerService = new TicketControllerService();
    await controllerService.assign(teamId, data.userId, data.gate ?? null);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "CREATE", entity: "TicketController", entityId: data.userId });

    revalidatePath("/admin/ticketing/controllers");
    return { success: true, message: "Contrôleur attribué avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'attribution" };
  }
}

export async function updateControllerGate(id: number, gate: string | null) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.manageControllers");

    const teamId = await requireTeamId();
    const controllerService = new TicketControllerService();
    await controllerService.updateGate(id, teamId, gate);

    revalidatePath("/admin/ticketing/controllers");
    return { success: true, message: "Porte mise à jour" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la mise à jour" };
  }
}

export async function removeController(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const access = await getUserAccess();
    requirePermission(access, "ticketing.manageControllers");

    const teamId = await requireTeamId();
    const controllerService = new TicketControllerService();
    await controllerService.remove(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "DELETE", entity: "TicketController", entityId: String(id) });

    revalidatePath("/admin/ticketing/controllers");
    return { success: true, message: "Contrôleur retiré" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du retrait" };
  }
}
