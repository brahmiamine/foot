import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@/entities/Role";
import { UserRole } from "@/entities/UserRole";
import { User } from "@/entities/User";

const roleFindOne = vi.fn();
const userFindOne = vi.fn();
const userRoleFindOne = vi.fn();
const userRoleCreate = vi.fn((data: unknown) => data);
const userRoleSave = vi.fn((data: unknown) => data);

vi.mock("@/lib/database", () => ({
  getDataSource: async () => ({
    getRepository: (entity: unknown) => {
      if (entity === Role) return { findOne: roleFindOne };
      if (entity === User) return { findOne: userFindOne };
      if (entity === UserRole) {
        return { findOne: userRoleFindOne, create: userRoleCreate, save: userRoleSave };
      }
      throw new Error("unexpected entity");
    },
  }),
}));

beforeEach(() => {
  roleFindOne.mockReset();
  userFindOne.mockReset();
  userRoleFindOne.mockReset();
  userRoleCreate.mockReset().mockImplementation((data: unknown) => data);
  userRoleSave.mockReset().mockImplementation((data: unknown) => data);
});

/**
 * TASK-P0-012 (todo.md): assignRole used to trust the client-supplied userId
 * without checking it belonged to the caller's team, letting an ADMIN of one
 * club attribute a role to a guessed userId from another club.
 */
describe("RoleService.assignRole cross-team guard", () => {
  it("refuses to assign a role to a user from another team", async () => {
    roleFindOne.mockResolvedValue({ id: 1, teamId: "team-owner", isGlobal: true });
    userFindOne.mockResolvedValue(null); // User.findOne({ id, teamId: "team-owner" }) -> not found

    const { RoleService } = await import("./RoleService");
    const service = new RoleService();

    await expect(service.assignRole("team-owner", "user-other-club", 1, null)).rejects.toThrow(
      "Utilisateur non trouvé pour ce club",
    );
    expect(userRoleFindOne).not.toHaveBeenCalled();
    expect(userRoleSave).not.toHaveBeenCalled();
  });

  it("assigns the role when the user belongs to the caller's team", async () => {
    roleFindOne.mockResolvedValue({ id: 1, teamId: "team-owner", isGlobal: true });
    userFindOne.mockResolvedValue({ id: "user-1", teamId: "team-owner" });
    userRoleFindOne.mockResolvedValue(null);

    const { RoleService } = await import("./RoleService");
    const service = new RoleService();

    const assignment = await service.assignRole("team-owner", "user-1", 1, null);

    expect(userRoleSave).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "team-owner", userId: "user-1", roleId: 1 }),
    );
    expect(assignment).toMatchObject({ teamId: "team-owner", userId: "user-1", roleId: 1 });
  });
});
