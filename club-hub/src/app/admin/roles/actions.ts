"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getUserAccess, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { RoleService } from "@/services/RoleService";
import { AuditLogService } from "@/services/AuditLogService";
import {
  createRoleSchema,
  updateRoleSchema,
  assignRoleSchema,
  createRoleDelegationSchema,
  revokeRoleDelegationSchema,
} from "@/types/roles";

async function requireClubAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Action réservée à l'administrateur du club");
  }
  return session;
}

async function requireDelegationManager() {
  const access = await getUserAccess();
  const teamId = await requireTeamId();
  if (access.teamId !== teamId) throw new Error("Contexte club incohérent");
  requirePermission(access, "roles.manage");
  return { access, teamId };
}

function optionalFormValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

    await new AuditLogService().create({
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

    await new AuditLogService().create({
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
    await new RoleService().delete(id, teamId);

    await new AuditLogService().create({
      userId: session.user.id,
      action: "DELETE",
      entity: "Role",
      entityId: String(id),
    });

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
      category: optionalFormValue(formData, "category"),
      validFrom: optionalFormValue(formData, "validFrom"),
      validUntil: optionalFormValue(formData, "validUntil"),
      reason: optionalFormValue(formData, "reason"),
    });

    const teamId = await requireTeamId();
    const assignment = await new RoleService().assignRole(
      teamId,
      data.userId,
      data.roleId,
      data.category ?? null,
      {
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        grantedBy: session.user.id,
        reason: data.reason ?? null,
      },
    );

    await new AuditLogService().create({
      userId: session.user.id,
      action: "CREATE",
      entity: "UserRole",
      entityId: String(assignment.id),
      after: {
        userId: data.userId,
        roleId: data.roleId,
        category: data.category ?? null,
        validFrom: data.validFrom ?? null,
        validUntil: data.validUntil ?? null,
        reason: data.reason ?? null,
      },
    });

    revalidatePath("/admin/roles");
    revalidatePath("/admin/users");
    return { success: true, message: data.validFrom || data.validUntil ? "Rôle temporaire attribué" : "Rôle attribué avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'attribution" };
  }
}

export async function removeRoleAssignment(id: number) {
  try {
    const session = await requireClubAdmin();
    const teamId = await requireTeamId();
    await new RoleService().removeAssignment(id, teamId);

    await new AuditLogService().create({
      userId: session.user.id,
      action: "DELETE",
      entity: "UserRole",
      entityId: String(id),
    });

    revalidatePath("/admin/roles");
    revalidatePath("/admin/users");
    return { success: true, message: "Attribution retirée avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du retrait" };
  }
}

export async function revokeRoleAssignment(id: number, formData: FormData) {
  try {
    const session = await requireClubAdmin();
    const teamId = await requireTeamId();
    const reason = optionalFormValue(formData, "reason") ?? "Révocation administrative";
    const assignment = await new RoleService().revokeAssignment(id, teamId, session.user.id, reason);

    await new AuditLogService().create({
      userId: session.user.id,
      action: "REVOKE",
      entity: "UserRole",
      entityId: String(id),
      after: { revokedAt: assignment.revokedAt, reason: assignment.revocationReason },
    });

    revalidatePath("/admin/roles");
    revalidatePath("/admin/users");
    return { success: true, message: "Attribution révoquée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la révocation" };
  }
}

export async function createRoleDelegation(formData: FormData) {
  try {
    const { access, teamId } = await requireDelegationManager();
    const data = createRoleDelegationSchema.parse({
      delegateeUserId: formData.get("delegateeUserId") as string,
      permissions: formData.getAll("permissions") as string[],
      category: optionalFormValue(formData, "category"),
      validFrom: formData.get("validFrom") as string,
      validUntil: formData.get("validUntil") as string,
      reason: formData.get("reason") as string,
    });

    const delegation = await new RoleService().createDelegation(teamId, access.userId, {
      delegateeUserId: data.delegateeUserId,
      permissions: data.permissions,
      category: data.category ?? null,
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
      reason: data.reason,
    });

    await new AuditLogService().create({
      userId: access.userId,
      action: "CREATE",
      entity: "RoleDelegation",
      entityId: String(delegation.id),
      after: {
        delegateeUserId: delegation.delegateeUserId,
        permissions: RoleService.parseDelegationPermissions(delegation),
        category: delegation.category ?? null,
        validFrom: delegation.validFrom,
        validUntil: delegation.validUntil,
        reason: delegation.reason,
      },
    });

    revalidatePath("/admin/roles");
    return { success: true, message: "Délégation temporaire créée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la délégation" };
  }
}

export async function revokeRoleDelegation(formData: FormData) {
  try {
    const { access, teamId } = await requireDelegationManager();
    const data = revokeRoleDelegationSchema.parse({
      delegationId: formData.get("delegationId") as string,
      reason: formData.get("reason") as string,
    });
    const roleService = new RoleService();
    const delegation = await roleService.revokeDelegation(
      data.delegationId,
      teamId,
      access.userId,
      data.reason,
    );

    await new AuditLogService().create({
      userId: access.userId,
      action: "REVOKE",
      entity: "RoleDelegation",
      entityId: String(delegation.id),
      after: { revokedAt: delegation.revokedAt, reason: delegation.revocationReason },
    });

    revalidatePath("/admin/roles");
    return { success: true, message: "Délégation révoquée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la révocation" };
  }
}
