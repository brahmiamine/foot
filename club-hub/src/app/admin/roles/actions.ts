"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { RoleService } from "@/services/RoleService";
import { AuditLogService } from "@/services/AuditLogService";
import { createRoleSchema, updateRoleSchema, assignRoleSchema } from "@/types/roles";

/**
 * Gestion des rôles & attributions — réservée au président du club (ADMIN),
 * seul habilité à créer des comptes et à leur attribuer des permissions.
 */
async function requireClubAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Action réservée à l'administrateur du club");
  }
  return session;
}

export async function createRole(formData: FormData) {
  try {
    const session = await requireClubAdmin();
    const data = createRoleSchema.parse({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      isGlobal: formData.get("isGlobal") === "on",
      permissions: formData.getAll("permissions") as string[],
    });

    const teamId = await requireTeamId();
    const roleService = new RoleService();
    const role = await roleService.create(data, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "Role",
      entityId: String(role.id),
      after: { name: role.name, isGlobal: role.isGlobal },
    });

    revalidatePath("/admin/roles");
    return { success: true, message: "Rôle créé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateRole(id: number, formData: FormData) {
  try {
    const session = await requireClubAdmin();
    const data = updateRoleSchema.parse({
      name: (formData.get("name") as string) || undefined,
      description: (formData.get("description") as string) || null,
      isGlobal: formData.get("isGlobal") === "on",
      permissions: formData.getAll("permissions") as string[],
    });

    const teamId = await requireTeamId();
    const roleService = new RoleService();
    await roleService.update(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Role",
      entityId: String(id),
      after: data,
    });

    revalidatePath("/admin/roles");
    return { success: true, message: "Rôle modifié avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteRole(id: number) {
  try {
    const session = await requireClubAdmin();
    const teamId = await requireTeamId();
    const roleService = new RoleService();
    await roleService.delete(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "DELETE", entity: "Role", entityId: String(id) });

    revalidatePath("/admin/roles");
    return { success: true, message: "Rôle supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

export async function assignRoleToUser(formData: FormData) {
  try {
    const session = await requireClubAdmin();
    const data = assignRoleSchema.parse({
      userId: formData.get("userId") as string,
      roleId: formData.get("roleId") as string,
      category: (formData.get("category") as string) || null,
    });

    const teamId = await requireTeamId();
    const roleService = new RoleService();
    await roleService.assignRole(teamId, data.userId, data.roleId, data.category ?? null);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "CREATE",
      entity: "UserRole",
      entityId: `${data.userId}:${data.roleId}`,
      after: data,
    });

    revalidatePath("/admin/roles");
    revalidatePath("/admin/users");
    return { success: true, message: "Rôle attribué avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'attribution" };
  }
}

export async function removeRoleAssignment(id: number) {
  try {
    const session = await requireClubAdmin();
    const teamId = await requireTeamId();
    const roleService = new RoleService();
    await roleService.removeAssignment(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({ userId: session.user.id, action: "DELETE", entity: "UserRole", entityId: String(id) });

    revalidatePath("/admin/roles");
    revalidatePath("/admin/users");
    return { success: true, message: "Attribution retirée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du retrait" };
  }
}
