import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { NextRequest } from "next/server";
import { createTestDataSource } from "@/test/testDataSource";
import { MarketOrder } from "@/entities/MarketOrder";
import { Seller } from "@/entities/Seller";
import { SellerOrder } from "@/entities/SellerOrder";
import { SellerOrderStatus, SellerStatus } from "@/entities/enums";
import type { SellerSessionUser } from "@/lib/session";

let dataSource: DataSource;
let mockSession: SellerSessionUser | null;

vi.mock("@/lib/database", () => ({
  getDataSource: async () => dataSource,
}));

vi.mock("@/lib/session", () => ({
  getCurrentSellerSession: async () => mockSession,
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

/** requireActiveSeller() recharge l'entité Seller : un vendeur ACTIVE doit exister en base. */
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

async function seedOrder(sellerId: string, status: SellerOrderStatus): Promise<SellerOrder> {
  const marketOrderRepo = dataSource.getRepository(MarketOrder);
  const marketOrder = await marketOrderRepo.save(
    marketOrderRepo.create({
      orderNumber: `ORD-${randomUUID()}`,
      customerName: "Client",
      customerEmail: "client@example.com",
      totalAmount: "100.000",
    }),
  );

  const repo = dataSource.getRepository(SellerOrder);
  return repo.save(
    repo.create({
      orderId: marketOrder.id,
      sellerId,
      status,
      subtotal: "100.000",
      commissionRate: "10.00",
      commissionAmount: "10.000",
      netAmount: "90.000",
    }),
  );
}

beforeEach(async () => {
  dataSource = await createTestDataSource();
  mockSession = null;
});

afterEach(async () => {
  await dataSource.destroy();
});

function buildRequest(status: string) {
  return new NextRequest("http://localhost/api/orders/order-1/status", {
    method: "POST",
    body: JSON.stringify({ status }),
    headers: { "content-type": "application/json" },
  });
}

/** TS-35 — transitions commandes (SellerOrder, cycle vendeur). */
describe("POST /api/orders/[id]/status", () => {
  it("advances CONFIRMED -> PROCESSING for the owning seller", async () => {
    const { POST } = await import("./route");
    const sellerId = randomUUID();
    await seedActiveSeller(sellerId);
    mockSession = sessionFor(sellerId);
    const order = await seedOrder(sellerId, SellerOrderStatus.CONFIRMED);

    const response = await POST(buildRequest(SellerOrderStatus.PROCESSING), {
      params: Promise.resolve({ id: order.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order.status).toBe(SellerOrderStatus.PROCESSING);
  });

  it("rejects skipping a step (CONFIRMED -> READY_TO_SHIP)", async () => {
    const { POST } = await import("./route");
    const sellerId = randomUUID();
    await seedActiveSeller(sellerId);
    mockSession = sessionFor(sellerId);
    const order = await seedOrder(sellerId, SellerOrderStatus.CONFIRMED);

    const response = await POST(buildRequest(SellerOrderStatus.READY_TO_SHIP), {
      params: Promise.resolve({ id: order.id }),
    });

    expect(response.status).toBe(409);
  });

  it("rejects reaching SHIPPED through this endpoint (must go through /shipping)", async () => {
    const { POST } = await import("./route");
    const sellerId = randomUUID();
    await seedActiveSeller(sellerId);
    mockSession = sessionFor(sellerId);
    const order = await seedOrder(sellerId, SellerOrderStatus.READY_TO_SHIP);

    const response = await POST(buildRequest(SellerOrderStatus.SHIPPED), {
      params: Promise.resolve({ id: order.id }),
    });

    expect(response.status).toBe(409);
  });

  it("returns 404 (never 403) for another seller's order — no cross-vendor access", async () => {
    const { POST } = await import("./route");
    const ownerId = randomUUID();
    await seedActiveSeller(ownerId);
    const order = await seedOrder(ownerId, SellerOrderStatus.CONFIRMED);
    const otherSellerId = randomUUID();
    await seedActiveSeller(otherSellerId);
    mockSession = sessionFor(otherSellerId);

    const response = await POST(buildRequest(SellerOrderStatus.PROCESSING), {
      params: Promise.resolve({ id: order.id }),
    });

    expect(response.status).toBe(404);
  });

  it("requires an authenticated seller session", async () => {
    const { POST } = await import("./route");
    mockSession = null;

    const response = await POST(buildRequest(SellerOrderStatus.PROCESSING), {
      params: Promise.resolve({ id: randomUUID() }),
    });

    expect(response.status).toBe(401);
  });
});
