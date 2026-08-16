import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { NextRequest } from "next/server";
import { createTestDataSource } from "@/test/testDataSource";
import { InventoryItem } from "@/entities/InventoryItem";
import { Product } from "@/entities/Product";
import { Seller } from "@/entities/Seller";
import { ProductStatus, SellerStatus } from "@/entities/enums";
import type { SellerSessionUser } from "@/lib/session";

const marketplace = vi.hoisted(() => ({
  updateInventory: vi.fn(),
}));

let dataSource: DataSource;
let mockSession: SellerSessionUser | null;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

vi.mock("@/lib/session", () => ({
  getCurrentSellerSession: async () => mockSession,
}));

vi.mock("@/lib/marketplaceApiClient", () => ({
  updateMarketplaceInventory: marketplace.updateInventory,
}));

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

async function seedActiveSeller(id: string): Promise<Seller> {
  const repo = dataSource.getRepository(Seller);
  return repo.save(
    repo.create({
      id,
      clubId: randomUUID(),
      businessName: "Ma Boutique",
      ownerName: "Amine",
      email: `seller-${randomUUID()}@example.com`,
      status: SellerStatus.ACTIVE,
    }),
  );
}

async function seedInventoryItem(sellerId: string, available = 5): Promise<InventoryItem> {
  const productRepo = dataSource.getRepository(Product);
  const product = await productRepo.save(
    productRepo.create({
      sellerId,
      name: "Maillot domicile",
      slug: `maillot-${randomUUID()}`,
      sku: `SKU-${randomUUID()}`,
      price: "80.000",
      status: ProductStatus.PUBLISHED,
    }),
  );

  const repo = dataSource.getRepository(InventoryItem);
  return repo.save(
    repo.create({
      sellerId,
      productId: product.id,
      variantId: null,
      available,
      reserved: 0,
      sold: 0,
    }),
  );
}

beforeEach(async () => {
  dataSource = await createTestDataSource();
  mockSession = null;
  marketplace.updateInventory.mockReset();
});

afterEach(async () => {
  await dataSource.destroy();
});

function buildRequest(available: number) {
  return new NextRequest("http://localhost/api/inventory/item-1", {
    method: "PATCH",
    body: JSON.stringify({ available }),
    headers: { "content-type": "application/json" },
  });
}

describe("PATCH /api/inventory/[id]", () => {
  it("delegates the stock update to Marketplace for the authenticated seller", async () => {
    const { PATCH } = await import("./route");
    const sellerId = randomUUID();
    await seedActiveSeller(sellerId);
    mockSession = sessionFor(sellerId);
    const item = await seedInventoryItem(sellerId, 5);
    marketplace.updateInventory.mockResolvedValue({ ...item, available: 12 });

    const response = await PATCH(buildRequest(12), {
      params: Promise.resolve({ id: item.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.item.available).toBe(12);
    expect(marketplace.updateInventory).toHaveBeenCalledWith(sellerId, item.id, 12);
  });

  it("preserves Marketplace 404 ownership concealment", async () => {
    const { PATCH } = await import("./route");
    const ownerId = randomUUID();
    await seedActiveSeller(ownerId);
    const item = await seedInventoryItem(ownerId, 5);
    const otherSellerId = randomUUID();
    await seedActiveSeller(otherSellerId);
    mockSession = sessionFor(otherSellerId);
    marketplace.updateInventory.mockRejectedValue(
      Object.assign(new Error("Ressource introuvable."), { status: 404 }),
    );

    const response = await PATCH(buildRequest(999), {
      params: Promise.resolve({ id: item.id }),
    });

    expect(response.status).toBe(404);
    expect(marketplace.updateInventory).toHaveBeenCalledWith(
      otherSellerId,
      item.id,
      999,
    );
    const reloaded = await dataSource
      .getRepository(InventoryItem)
      .findOne({ where: { id: item.id } });
    expect(reloaded?.available).toBe(5);
  });

  it("rejects a negative available value before calling Marketplace", async () => {
    const { PATCH } = await import("./route");
    const sellerId = randomUUID();
    await seedActiveSeller(sellerId);
    mockSession = sessionFor(sellerId);
    const item = await seedInventoryItem(sellerId, 5);

    const response = await PATCH(buildRequest(-1), {
      params: Promise.resolve({ id: item.id }),
    });

    expect(response.status).toBe(422);
    expect(marketplace.updateInventory).not.toHaveBeenCalled();
  });

  it("requires an authenticated seller session", async () => {
    const { PATCH } = await import("./route");
    mockSession = null;

    const response = await PATCH(buildRequest(5), {
      params: Promise.resolve({ id: randomUUID() }),
    });

    expect(response.status).toBe(401);
    expect(marketplace.updateInventory).not.toHaveBeenCalled();
  });
});
