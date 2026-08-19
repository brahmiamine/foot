"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { UserService } from "@/services/UserService";
import { AuditLogService } from "@/services/AuditLogService";
import { createClubUserSchema, updateClubUserSchema } from "@/types/club-users";

/** Gestion des comptes du club — réservée au président (ADMIN). */
async function requireClubAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Action réservée à l'administrateur du club");
  }
  return session;
}

function optionalAccessValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : null;
}

export async function createClubUser(formData: FormData) {
  try {
    const session = await requireClubAdmin();
    const data = createClubUserSchema.parse({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      isActive: formData.get("isActive") === "on",
      accessValidFrom: optionalAccessValue(formData, "accessValidFrom"),
      accessValidUntil: optionalAccessValue(formData, "accessValidUntil"),
    });

    const teamId = await requireTeamId();
    const userService = new UserService();
    const user = await userService.create(data, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      after: {
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        accessValidFrom: user.accessValidFrom,
        accessValidUntil: user.accessValidUntil,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/roles");
    return { success: true, message: "Compte créé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateClubUser(id: string, formData: FormData) {
  try {
    const session = await requireClubAdmin();
    const password = (formData.get("password") as string) || "";
    const data = updateClubUserSchema.parse({
      name: (formData.get("name") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      password: password || undefined,
      isActive: formData.get("isActive") === "on",
      accessValidFrom: optionalAccessValue(formData, "accessValidFrom"),
      accessValidUntil: optionalAccessValue(formData, "accessValidUntil"),
    });

    const teamId = await requireTeamId();
    const userService = new UserService();
    const before = await userService.findById(id, teamId);
    if (!before) throw new Error("Compte non trouvé");
    const updated = await userService.update(id, teamId, { ...data, password: data.password || undefined });

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      before: {
        name: before.name,
        email: before.email,
        isActive: before.isActive,
        accessValidFrom: before.accessValidFrom,
        accessValidUntil: before.accessValidUntil,
      },
      after: {
        name: updated.name,
        email: updated.email,
        isActive: updated.isActive,
        accessValidFrom: updated.accessValidFrom,
        accessValidUntil: updated.accessValidUntil,
      },
    });

    revalidatePath("/admin/users");
    return { success: true, message: "Compte modifié avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteClubUser(id: string) {
  try {
    const session = await requireClubAdmin();
    const teamId = await requireTeamId();
    const userService = new UserService();
    await userService.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "DELETE", entity: "User", entityId: id });

    revalidatePath("/admin/users");
    revalidatePath("/admin/roles");
    return { success: true, message: "Compte supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}