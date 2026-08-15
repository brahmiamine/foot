import { createClubIdentityAdapter } from '@/adapters/identity/createClubIdentityAdapter'
import { getDataSource } from "@/lib/database";
import { Role } from "@/entities/Role";
import { UserRole } from "@/entities/UserRole";
import { Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PRESETS, isValidPermissionKey } from "@/lib/permissions";
import type { IdentityDirectoryPort } from '../../../packages/domain-contracts/src/identity'

export interface RoleWithAssignees extends Role {
  permissionKeys: string[];
}

/**
 * Club-owned RBAC service. cms_roles/cms_user_roles remain in the Club domain;
 * account existence and team ownership are checked through Identity.
 */
export class RoleService {
  constructor(
    private readonly identity: IdentityDirectoryPort = createClubIdentityAdapter(),
  ) {}

  private async getRoleRepository(): Promise<Repository<Role>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Role);
  }

  private async getUserRoleRepository(): Promise<Repository<UserRole>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(UserRole);
  }

  async findAll(teamId: string): Promise<Role[]> {
    const repository = await this.getRoleRepository();
    return repository.find({ where: { teamId }, order: { name: "ASC" } });
  }

  async findById(id: number, teamId: string): Promise<Role | null> {
    const repository = await this.getRoleRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  async ensureDefaultRoles(teamId: string): Promise<void> {
    const repository = await this.getRoleRepository();
    const existing = await repository.count({ where: { teamId } });
    if (existing > 0) return;

    const roles = DEFAULT_ROLE_PRESETS.map((preset) =>
      repository.create({
        teamId,
        name: preset.name,
        description: preset.description,
        isGlobal: preset.isGlobal,
        isSystem: true,
        permissions: JSON.stringify(preset.permissions),
      })
    );
    await repository.save(roles);
  }

  async create(
    data: { name: string; description?: string | null; isGlobal: boolean; permissions: string[] },
    teamId: string
  ): Promise<Role> {
    const repository = await this.getRoleRepository();
    const permissions = data.permissions.filter(isValidPermissionKey);

    const role = repository.create({
      teamId,
      name: data.name,
      description: data.description ?? null,
      isGlobal: data.isGlobal,
      isSystem: false,
      permissions: JSON.stringify(permissions),
    });
    return repository.save(role);
  }

  async update(
    id: number,
    teamId: string,
    data: { name?: string; description?: string | null; isGlobal?: boolean; permissions?: string[] }
  ): Promise<Role> {
    const repository = await this.getRoleRepository();
    const role = await this.findById(id, teamId);
    if (!role) {
      throw new Error("Rôle non trouvé");
    }

    if (data.name !== undefined) role.name = data.name;
    if (data.description !== undefined) role.description = data.description;
    if (data.isGlobal !== undefined) role.isGlobal = data.isGlobal;
    if (data.permissions !== undefined) {
      role.permissions = JSON.stringify(data.permissions.filter(isValidPermissionKey));
    }

    return repository.save(role);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRoleRepository();
    const role = await this.findById(id, teamId);
    if (!role) {
      throw new Error("Rôle non trouvé");
    }
    if (role.isSystem) {
      const userRoleRepository = await this.getUserRoleRepository();
      const assignments = await userRoleRepository.count({ where: { roleId: id } });
      if (assignments > 0) {
        throw new Error("Ce rôle est encore attribué à des utilisateurs, retirez d'abord les attributions");
      }
    }
    await repository.remove(role);
    return true;
  }

  static parsePermissions(role: Role): string[] {
    try {
      const parsed = JSON.parse(role.permissions);
      return Array.isArray(parsed).filter ? parsed.filter((p): p is string => typeof p === "string") : [];
    } catch {
      return [];
    }
  }

  // ---- Attribution rôle <-> utilisateur ----------------------------------

  async findAssignmentsForTeam(teamId: string): Promise<UserRole[]> {
    const repository = await this.getUserRoleRepository();
    // Deliberately do not join User: Identity owns that table. Caller can use
    // UserService/Identity directory for display names.
    return repository.find({ where: { teamId }, relations: ["role"], order: { createdAt: "ASC" } });
  }

  async findAssignmentsForUser(teamId: string, userId: string): Promise<UserRole[]> {
    const repository = await this.getUserRoleRepository();
    return repository.find({ where: { teamId, userId }, relations: ["role"] });
  }

  async assignRole(
    teamId: string,
    userId: string,
    roleId: number,
    category: AgeCategory | null
  ): Promise<UserRole> {
    const roleRepository = await this.getRoleRepository();
    const role = await roleRepository.findOne({ where: { id: roleId, teamId } });
    if (!role) {
      throw new Error("Rôle non trouvé");
    }

    // TASK-P0-012 remains enforced, but ownership lookup now comes from Identity.
    const targetUser = await this.identity.getUserById(userId);
    if (!targetUser || targetUser.teamId !== teamId) {
      throw new Error("Utilisateur non trouvé pour ce club");
    }
    if (!role.isGlobal && !category) {
      throw new Error("Une catégorie est requise pour ce rôle");
    }

    const repository = await this.getUserRoleRepository();

    if (role.isGlobal) {
      const existing = await repository.findOne({ where: { teamId, userId, roleId } });
      if (existing) return existing;
    } else {
      const existing = await repository.findOne({ where: { teamId, userId, roleId, category: category ?? undefined } });
      if (existing) return existing;
    }

    const assignment = repository.create({
      teamId,
      userId,
      roleId,
      category: role.isGlobal ? null : category,
    });
    return repository.save(assignment);
  }

  async removeAssignment(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getUserRoleRepository();
    const assignment = await repository.findOne({ where: { id, teamId } });
    if (!assignment) {
      throw new Error("Attribution non trouvée");
    }
    await repository.remove(assignment);
    return true;
  }

  async getEffectiveAccess(
    teamId: string,
    userId: string
  ): Promise<{ permissions: string[]; categories: "ALL" | AgeCategory[] }> {
    const assignments = await this.findAssignmentsForUser(teamId, userId);

    let isAllCategories = false;
    const permissions = new Set<string>();
    const categories = new Set<AgeCategory>();

    for (const assignment of assignments) {
      const role = assignment.role;
      if (!role) continue;
      for (const key of RoleService.parsePermissions(role)) {
        permissions.add(key);
      }
      if (role.isGlobal) {
        isAllCategories = true;
      } else if (assignment.category) {
        categories.add(assignment.category);
      }
    }

    return {
      permissions: Array.from(permissions),
      categories: isAllCategories ? "ALL" : Array.from(categories),
    };
  }
}

export { ALL_PERMISSION_KEYS };
