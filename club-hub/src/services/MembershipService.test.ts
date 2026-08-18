import { beforeEach, describe, expect, it, vi } from "vitest";
import { Membership, MembershipType } from "@/entities/Membership";
import { MembershipService } from "./MembershipService";

let typeRows: MembershipType[] = [];
let membershipRows: Membership[] = [];

vi.mock("@/lib/database", () => ({
  getDataSource: async () => {
    const repoFor = (entity: unknown) => {
      const rows = entity === MembershipType ? typeRows : membershipRows;
      return {
        findOne: (options: { where: Record<string, unknown> | Record<string, unknown>[] }) => {
          const wheres = Array.isArray(options.where) ? options.where : [options.where];
          const match = rows.find((row) =>
            wheres.some((where) =>
              Object.entries(where).every(([key, value]) => (row as never)[key] === value),
            ),
          );
          return Promise.resolve(match ?? null);
        },
        find: (options: { where: Record<string, unknown> }) =>
          Promise.resolve(
            rows.filter((row) =>
              Object.entries(options.where).every(([key, value]) => (row as never)[key] === value),
            ),
          ),
        create: (data: Record<string, unknown>) => ({ id: `id-${rows.length + 1}`, ...data }),
        save: (row: { id: string }) => {
          const list = (entity === MembershipType ? typeRows : membershipRows) as unknown as { id: string }[];
          const index = list.findIndex((r) => r.id === row.id);
          if (index >= 0) list[index] = row;
          else list.push(row);
          return Promise.resolve(row);
        },
      };
    };

    return {
      getRepository: repoFor,
      transaction: async (work: (manager: { getRepository: typeof repoFor }) => Promise<unknown>) =>
        work({ getRepository: repoFor }),
    };
  },
}));

beforeEach(() => {
  typeRows = [];
  membershipRows = [];
});

function seedType(overrides: Partial<MembershipType> = {}): MembershipType {
  const type = {
    id: "type-1",
    teamId: "team-1",
    code: "SOCIO",
    labelFr: "Socio",
    labelAr: null,
    isActive: true,
    requiresApproval: false,
    durationDays: null,
    rights: null,
    version: 1,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as MembershipType;
  typeRows.push(type);
  return type;
}

describe("MembershipService", () => {
  it("auto-activates a membership when the type does not require approval", async () => {
    const type = seedType({ requiresApproval: false, durationDays: 365 });
    const service = new MembershipService();

    const membership = await service.apply("team-1", "user-1", type.id);

    expect(membership.status).toBe("ACTIVE");
    expect(membership.expiresAt).not.toBeNull();
  });

  it("requires approval before activation when the type demands it", async () => {
    const type = seedType({ requiresApproval: true });
    const service = new MembershipService();

    const membership = await service.apply("team-1", "user-1", type.id);
    expect(membership.status).toBe("SUBMITTED");

    const activated = await service.approve("team-1", membership.id, "admin-1");
    expect(activated.status).toBe("ACTIVE");
    expect(activated.approvedBy).toBe("admin-1");
  });

  it("rejects a second application while one is already pending or active", async () => {
    const type = seedType({ requiresApproval: true });
    const service = new MembershipService();
    await service.apply("team-1", "user-1", type.id);

    await expect(service.apply("team-1", "user-1", type.id)).rejects.toThrow();
  });

  it("findActiveForUser ignores an expired membership even before the status column catches up", async () => {
    const type = seedType({ durationDays: 30 });
    membershipRows.push({
      id: "m-1",
      teamId: "team-1",
      userId: "user-1",
      membershipTypeId: type.id,
      membershipType: type,
      status: "ACTIVE",
      approvedAt: new Date(),
      approvedBy: null,
      rejectionReason: null,
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Membership);

    const service = new MembershipService();
    const active = await service.findActiveForUser("team-1", "user-1");
    expect(active).toBeNull();
  });

  it("findActiveForUser exposes the type code and rights for a genuinely active membership", async () => {
    const type = seedType({ code: "VIP", rights: ["PRESALE_ACCESS"] });
    membershipRows.push({
      id: "m-1",
      teamId: "team-1",
      userId: "user-1",
      membershipTypeId: type.id,
      membershipType: type,
      status: "ACTIVE",
      approvedAt: new Date(),
      approvedBy: null,
      rejectionReason: null,
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Membership);

    const service = new MembershipService();
    const active = await service.findActiveForUser("team-1", "user-1");
    expect(active).toEqual({
      membershipId: "m-1",
      membershipTypeId: type.id,
      code: "VIP",
      rights: ["PRESALE_ACCESS"],
      expiresAt: null,
    });
  });

  it("does not leak an active membership across clubs", async () => {
    const type = seedType({ teamId: "team-1" });
    membershipRows.push({
      id: "m-1",
      teamId: "team-1",
      userId: "user-1",
      membershipTypeId: type.id,
      membershipType: type,
      status: "ACTIVE",
      approvedAt: new Date(),
      approvedBy: null,
      rejectionReason: null,
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Membership);

    const service = new MembershipService();
    const active = await service.findActiveForUser("team-2", "user-1");
    expect(active).toBeNull();
  });
});
