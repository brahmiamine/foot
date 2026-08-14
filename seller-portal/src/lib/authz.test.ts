import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { Seller } from "@/entities/Seller";
import { SellerStatus } from "@/entities/enums";
import type { SellerSessionUser } from "@/lib/session";

let dataSource: DataSource;
let mockSession: SellerSessionUser | null;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

vi.mock("@/lib/session", () => ({
  getCurrentSellerSession: async () => mockSession,
}));

async function seedSeller(status: SellerStatus): Promise<Seller> {
  const repo = dataSource.getRepository(Seller);
  return repo.save(
    repo.create({
      id: randomUUID(),
      clubId: randomUUID(),
      businessName: "Ma Boutique",
      ownerName: "Amine",
      email: `seller-${randomUUID()}@example.com`,
      status,
    }),
  );
}

function sessionFor(sellerId: string): SellerSessionUser {
  return {
    sellerUserId: randomUUID(),
    sellerId,
    clubId: randomUUID(),
    email: "amine@example.com",
    name: "Amine",
    role: "OWNER",
  };
}

beforeEach(async () => {
  dataSource = await createTestDataSource();
  mockSession = null;
});

afterEach(async () => {
  await dataSource.destroy();
});

describe("requireSellerSession (SQLite réel)", () => {
  it("renvoie la session quand elle existe", async () => {
    const { requireSellerSession } = await import("./authz");
    const seller = await seedSeller(SellerStatus.ACTIVE);
    mockSession = sessionFor(seller.id);

    await expect(requireSellerSession()).resolves.toEqual(mockSession);
  });

  it("lève UnauthorizedError sans session", async () => {
    const { requireSellerSession, UnauthorizedError } = await import("./authz");
    await expect(requireSellerSession()).rejects.toThrow(UnauthorizedError);
  });
});

describe("requireActiveSeller (SQLite réel)", () => {
  it("autorise un vendeur ACTIVE", async () => {
    const { requireActiveSeller } = await import("./authz");
    const seller = await seedSeller(SellerStatus.ACTIVE);
    mockSession = sessionFor(seller.id);

    const result = await requireActiveSeller();
    expect(result.seller.id).toBe(seller.id);
  });

  it("autorise un vendeur PENDING (pas encore validé, mais pas bloqué)", async () => {
    const { requireActiveSeller } = await import("./authz");
    const seller = await seedSeller(SellerStatus.PENDING);
    mockSession = sessionFor(seller.id);

    await expect(requireActiveSeller()).resolves.toBeTruthy();
  });

  it.each([SellerStatus.SUSPENDED, SellerStatus.CLOSED, SellerStatus.REJECTED])(
    "refuse un vendeur %s (ForbiddenError)",
    async (status) => {
      const { requireActiveSeller, ForbiddenError } = await import("./authz");
      const seller = await seedSeller(status);
      mockSession = sessionFor(seller.id);

      await expect(requireActiveSeller()).rejects.toThrow(ForbiddenError);
    },
  );

  it("lève UnauthorizedError si le vendeur de la session n'existe plus en base", async () => {
    const { requireActiveSeller, UnauthorizedError } = await import("./authz");
    mockSession = sessionFor(randomUUID());

    await expect(requireActiveSeller()).rejects.toThrow(UnauthorizedError);
  });
});

describe("assertOwnedBySeller", () => {
  it("ne lève rien quand les deux ids correspondent", async () => {
    const { assertOwnedBySeller } = await import("./authz");
    expect(() => assertOwnedBySeller("seller-1", "seller-1")).not.toThrow();
  });

  it("lève NotFoundError (jamais Forbidden) quand les ids diffèrent", async () => {
    const { assertOwnedBySeller, NotFoundError } = await import("./authz");
    expect(() => assertOwnedBySeller("seller-1", "seller-2")).toThrow(NotFoundError);
  });
});
