import { createClubIdentityAdapter } from '@/adapters/identity/createClubIdentityAdapter'
import { getDataSource } from "@/lib/database";
import { Role } from "@/entities/Role";
import { UserRole } from "@/entities/UserRole";
import { RoleDelegation } from "@/entities/RoleDelegation";
import { IsNull, Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PRESETS, isValidPermissionKey } from "@/lib/permissions";
import {
  isAccessWindowActive,
  resolveDirectAuthority,
  resolveDirectAuthorityForWindow,
  validateDelegationGrant,
  type DirectAuthority,
  type DirectRoleGrant,
} from "@/lib/roleDelegation";
import type { IdentityDirectoryPort } from '../../../packages/domain-contracts/src/identity'

export interface RoleWithAssignees extends Role {
  permissionKeys: string[];
}

export interface RoleAssignmentWindowInput {
  validFrom?: Date | null;
  validUntil?: Date | null;
  grantedBy?: string | null;
  reason?: string | null;
}

export interface CreateRoleDelegationInput {
  delegateeUserId: string;
  permissions: string[];
  category: AgeCategory | null;
  validFrom: Date;
  validUntil: Date;
  reason: string;
}

/**
 * Club-owned RBAC service. Direct assignments and delegations remain in the
 * Club domain; account existence and team ownership are checked through
 * Identity. Delegated permissions are terminal: direct authority resolution
 * never consumes another delegation.
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

  private async getDelegationRepository(): Promise<Repository<RoleDelegation>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(RoleDelegation);
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
    if (!role) throw new Error("Rôle non trouvé");

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
    if (!role) throw new Error("Rôle non trouvé");
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
      return Array.isArray(parsed)
        ? parsed.filter((permission): permission is string => typeof permission === "string" && isValidPermissionKey(permission))
        : [];
    } catch {
      return [];
    }
  }

  static parseDelegationPermissions(delegation: RoleDelegation): string[] {
    try {
      const parsed = JSON.parse(delegation.permissions);
      return Array.isArray(parsed)
        ? parsed.filter((permission): permission is string => typeof permission === "string" && isValidPermissionKey(permission))
        : [];
    } catch {
      return [];
    }
  }

  // ---- Direct role assignments -------------------------------------------

  async findAssignmentsForTeam(teamId: string): Promise<UserRole[]> {
    const repository = await this.getUserRoleRepository();
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
    category: AgeCategory | null,
    window: RoleAssignmentWindowInput = {},
  ): Promise<UserRole> {
    const roleRepository = await this.getRoleRepository();
    const role = await roleRepository.findOne({ where: { id: roleId, teamId } });
    if (!role) throw new Error("Rôle non trouvé");

    const targetUser = await this.identity.getUserById(userId);
    if (!targetUser || targetUser.teamId !== teamId) {
      throw new Error("Utilisateur non trouvé pour ce club");
    }
    if (!role.isGlobal && !category) throw new Error("Une catégorie est requise pour ce rôle");

    const validFrom = window.validFrom ?? null;
    const validUntil = window.validUntil ?? null;
    if (validUntil && validFrom && validUntil.getTime() <= validFrom.getTime()) {
      throw new Error("La fin de validité du rôle doit être postérieure au début");
    }
    const isTemporary = validFrom !== null || validUntil !== null;
    const grantReason = window.reason?.trim() || null;
    if (isTemporary && !grantReason) {
      throw new Error("Un motif est obligatoire pour une attribution temporaire");
    }

    const repository = await this.getUserRoleRepository();
    const effectiveCategory = role.isGlobal ? null : category;
    const sameScope = await repository.find({
      where: {
        teamId,
        userId,
        roleId,
        category: effectiveCategory ?? IsNull(),
      },
    });

    const exactExisting = sameScope.find((assignment) => {
      if (assignment.revokedAt) return false;
      const sameFrom = (assignment.validFrom?.getTime() ?? null) === (validFrom?.getTime() ?? null);
      const sameUntil = (assignment.validUntil?.getTime() ?? null) === (validUntil?.getTime() ?? null);
      return sameFrom && sameUntil;
    });
    if (exactExisting) return exactExisting;

    const assignment = repository.create({
      teamId,
      userId,
      roleId,
      category: effectiveCategory,
      validFrom,
      validUntil,
      grantedBy: window.grantedBy ?? null,
      grantReason,
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
    });
    return repository.save(assignment);
  }

  async removeAssignment(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getUserRoleRepository();
    const assignment = await repository.findOne({ where: { id, teamId } });
    if (!assignment) throw new Error("Attribution non trouvée");
    await repository.remove(assignment);
    return true;
  }

  async revokeAssignment(
    id: number,
    teamId: string,
    actorUserId: string,
    reason: string,
  ): Promise<UserRole> {
    const revocationReason = reason.trim();
    if (!revocationReason) throw new Error("Un motif de révocation est obligatoire");
    const dataSource = await getDataSource();
    return dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(UserRole);
      const assignment = await repository.findOne({
        where: { id, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!assignment) throw new Error("Attribution non trouvée");
      if (assignment.revokedAt) return assignment;
      assignment.revokedAt = new Date();
      assignment.revokedBy = actorUserId;
      assignment.revocationReason = revocationReason;
      return repository.save(assignment);
    });
  }

  private directGrantsFrom(assignments: readonly UserRole[]): DirectRoleGrant[] {
    return assignments.flatMap((assignment) => {
      if (!assignment.role) return [];
      return [{
        permissions: RoleService.parsePermissions(assignment.role),
        category: assignment.category ?? null,
        isGlobal: assignment.role.isGlobal,
        validFrom: assignment.validFrom ?? null,
        validUntil: assignment.validUntil ?? null,
        revokedAt: assignment.revokedAt ?? null,
      } satisfies DirectRoleGrant];
    });
  }

  async getDirectAuthority(
    teamId: string,
    userId: string,
    category: AgeCategory | null,
    at: Date = new Date(),
  ): Promise<DirectAuthority> {
    const identityUser = await this.identity.getUserById(userId);
    if (!identityUser || identityUser.teamId !== teamId || !identityUser.isActive) {
      return { permissions: new Set(), canGlobalScope: false, category };
    }
    if (identityUser.role === "ADMIN" || identityUser.role === "CLUB_ADMIN") {
      return { permissions: new Set(ALL_PERMISSION_KEYS), canGlobalScope: true, category };
    }
    const assignments = await this.findAssignmentsForUser(teamId, userId);
    return resolveDirectAuthority(this.directGrantsFrom(assignments), category, at);
  }

  private async getDirectAuthorityForWindow(
    teamId: string,
    userId: string,
    category: AgeCategory | null,
    validFrom: Date,
    validUntil: Date,
  ): Promise<DirectAuthority> {
    const identityUser = await this.identity.getUserById(userId);
    if (!identityUser || identityUser.teamId !== teamId || !identityUser.isActive) {
      return { permissions: new Set(), canGlobalScope: false, category };
    }
    if (identityUser.role === "ADMIN" || identityUser.role === "CLUB_ADMIN") {
      return { permissions: new Set(ALL_PERMISSION_KEYS), canGlobalScope: true, category };
    }
    const assignments = await this.findAssignmentsForUser(teamId, userId);
    return resolveDirectAuthorityForWindow(
      this.directGrantsFrom(assignments),
      category,
      validFrom,
      validUntil,
    );
  }

  // ---- Terminal permission delegations ----------------------------------

  async findDelegationsForTeam(teamId: string): Promise<RoleDelegation[]> {
    const repository = await this.getDelegationRepository();
    return repository.find({ where: { teamId }, order: { createdAt: "DESC" } });
  }

  async findDelegationsForUser(teamId: string, delegateeUserId: string): Promise<RoleDelegation[]> {
    const repository = await this.getDelegationRepository();
    return repository.find({ where: { teamId, delegateeUserId }, order: { createdAt: "DESC" } });
  }

  async createDelegation(
    teamId: string,
    delegatorUserId: string,
    input: CreateRoleDelegationInput,
  ): Promise<RoleDelegation> {
    if (delegatorUserId === input.delegateeUserId) {
      throw new Error("Impossible de déléguer des permissions à soi-même");
    }
    if (!Number.isFinite(input.validFrom.getTime()) || !Number.isFinite(input.validUntil.getTime())) {
      throw new Error("Fenêtre de délégation invalide");
    }
    const delegatee = await this.identity.getUserById(input.delegateeUserId);
    if (!delegatee || delegatee.teamId !== teamId || !delegatee.isActive) {
      throw new Error("Destinataire de délégation non trouvé pour ce club");
    }

    const requestedPermissions = [...new Set(input.permissions)];
    if (requestedPermissions.some((permission) => !isValidPermissionKey(permission))) {
      throw new Error("Une permission demandée est inconnue");
    }
    const authority = await this.getDirectAuthorityForWindow(
      teamId,
      delegatorUserId,
      input.category,
      input.validFrom,
      input.validUntil,
    );
    validateDelegationGrant({
      requestedPermissions,
      category: input.category,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      reason: input.reason,
      authority,
    });

    const repository = await this.getDelegationRepository();
    return repository.save(repository.create({
      teamId,
      delegatorUserId,
      delegateeUserId: input.delegateeUserId,
      permissions: JSON.stringify(requestedPermissions),
      category: input.category,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      reason: input.reason.trim(),
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
    }));
  }

  async revokeDelegation(
    id: number,
    teamId: string,
    actorUserId: string,
    reason: string,
  ): Promise<RoleDelegation> {
    const revocationReason = reason.trim();
    if (!revocationReason) throw new Error("Un motif de révocation est obligatoire");
    const dataSource = await getDataSource();
    return dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RoleDelegation);
      const delegation = await repository.findOne({
        where: { id, teamId },
        lock: { mode: "pessimistic_write" },
      });
      if (!delegation) throw new Error("Délégation non trouvée");
      if (delegation.revokedAt) return delegation;
      delegation.revokedAt = new Date();
      delegation.revokedBy = actorUserId;
      delegation.revocationReason = revocationReason;
      return repository.save(delegation);
    });
  }

  async getEffectiveAccess(
    teamId: string,
    userId: string,
    at: Date = new Date(),
  ): Promise<{ permissions: string[]; categories: "ALL" | AgeCategory[] }> {
    const [assignments, delegations] = await Promise.all([
      this.findAssignmentsForUser(teamId, userId),
      this.findDelegationsForUser(teamId, userId),
    ]);

    let isAllCategories = false;
    const permissions = new Set<string>();
    const categories = new Set<AgeCategory>();

    for (const assignment of assignments) {
      if (!isAccessWindowActive({
        validFrom: assignment.validFrom ?? null,
        validUntil: assignment.validUntil ?? null,
        revokedAt: assignment.revokedAt ?? null,
      }, at)) continue;
      const role = assignment.role;
      if (!role) continue;
      RoleService.parsePermissions(role).forEach((permission) => permissions.add(permission));
      if (role.isGlobal) isAllCategories = true;
      else if (assignment.category) categories.add(assignment.category);
    }

    for (const delegation of delegations) {
      if (!isAccessWindowActive({
        validFrom: delegation.validFrom,
        validUntil: delegation.validUntil,
        revokedAt: delegation.revokedAt ?? null,
      }, at)) continue;

      // Re-evaluate the delegator's CURRENT direct authority. If their source
      // role was revoked/expired early, the delegated permission disappears
      // immediately without a cron or a transitive delegation chain.
      const sourceAuthority = await this.getDirectAuthority(
        teamId,
        delegation.delegatorUserId,
        delegation.category ?? null,
        at,
      );
      const effectiveDelegated = RoleService.parseDelegationPermissions(delegation)
        .filter((permission) => sourceAuthority.permissions.has(permission));
      if (effectiveDelegated.length === 0) continue;
      effectiveDelegated.forEach((permission) => permissions.add(permission));
      if (delegation.category === null && sourceAuthority.canGlobalScope) {
        isAllCategories = true;
      } else if (delegation.category) {
        categories.add(delegation.category);
      }
    }

    return {
      permissions: Array.from(permissions),
      categories: isAllCategories ? "ALL" : Array.from(categories),
    };
  }
}

export { ALL_PERMISSION_KEYS };
