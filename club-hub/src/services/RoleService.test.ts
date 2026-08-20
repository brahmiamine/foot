import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@/entities/Role";
import { UserRole } from "@/entities/UserRole";
import type { IdentityDirectoryPort } from '../../../packages/domain-contracts/src/identity'

const roleFindOne = vi.fn();
const userRoleFind = vi.fn();
const userRoleCreate = vi.fn((data: unknown) => data);
const userRoleSave = vi.fn((data: unknown) => data);
const getUserById = vi.fn();

vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    getRepository: (entity: unknown) => {
      if (entity === Role) return { findOne: roleFindOne };
      if (entity === UserRole) {
        return { find: userRoleFind, create: userRoleCreate, save: userRoleSave };
      }
      throw new Error("unexpected entity");
    },
  }),
}));

const identity: IdentityDirectoryPort = {
  getUserById: (...args) => getUserById(...args),
  getUserByEmail: vi.fn(),
  listUsers: vi.fn(),
};

beforeEach(() => {
  roleFindOne.mockReset();
  getUserById.mockReset();
  userRoleFind.mockReset().mockResolvedValue([]);
  userRoleCreate.mockReset().mockImplementation((data: unknown) => data);
  userRoleSave.mockReset().mockImplementation((data: unknown) => data);
});

/**
 * TASK-P0-012: the cross-team guard is preserved while user ownership moves
 * from a direct User repository lookup to the Identity directory port.
 */
describe("RoleService.assignRole cross-team guard", () => {
  it("refuses to assign a role to a user from another team", async () => {
    roleFindOne.mockResolvedValue({ id: 1, teamId: "team-owner", isGlobal: true });
    getUserById.mockResolvedValue({
      id: "user-other-club",
      name: "Other",
      email: "other@example.com",
      role: "OBSERVATEUR",
      isActive: true,
      teamId: "team-other",
      createdAt: new Date().toISOString(),
    });

    const { RoleService } = await import("./RoleService");
    const service = new RoleService(identity);

    await expect(service.assignRole("team-owner", "user-other-club", 1, null)).rejects.toThrow(
      "Utilisateur non trouvé pour ce club",
    );
    expect(userRoleFind).not.toHaveBeenCalled();
    expect(userRoleSave).not.toHaveBeenCalled();
  });

  it("refuses to assign a role when Identity cannot find the user", async () => {
    roleFindOne.mockResolvedValue({ id: 1, teamId: "team-owner", isGlobal: true });
    getUserById.mockResolvedValue(null);

    const { RoleService } = await import("./RoleService");
    const service = new RoleService(identity);

    await expect(service.assignRole("team-owner", "missing", 1, null)).rejects.toThrow(
      "Utilisateur non trouvé pour ce club",
    );
  });

  it("assigns the role when Identity confirms the user belongs to the caller's team", async () => {
    roleFindOne.mockResolvedValue({ id: 1, teamId: "team-owner", isGlobal: true });
    getUserById.mockResolvedValue({
      id: "user-1",
      name: "User",
      email: "user@example.com",
      role: "OBSERVATEUR",
      isActive: true,
      teamId: "team-owner",
      createdAt: new Date().toISOString(),
    });

    const { RoleService } = await import("./RoleService");
    const service = new RoleService(identity);

    const assignment = await service.assignRole("team-owner", "user-1", 1, null);

    expect(userRoleSave).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "team-owner", userId: "user-1", roleId: 1 }),
    );
    expect(assignment).toMatchObject({ teamId: "team-owner", userId: "user-1", roleId: 1 });
  });

  it("requires a reason for a temporary assignment", async () => {
    roleFindOne.mockResolvedValue({ id: 1, teamId: "team-owner", isGlobal: true });
    getUserById.mockResolvedValue({
      id: "user-1",
      name: "User",
      email: "user@example.com",
      role: "OBSERVATEUR",
      isActive: true,
      teamId: "team-owner",
      createdAt: new Date().toISOString(),
    });

    const { RoleService } = await import("./RoleService");
    const service = new RoleService(identity);

    await expect(service.assignRole("team-owner", "user-1", 1, null, {
      validFrom: new Date("2026-08-20T14:00:00.000Z"),
      validUntil: new Date("2026-08-21T14:00:00.000Z"),
    })).rejects.toThrow("motif");
    expect(userRoleSave).not.toHaveBeenCalled();
  });
});
