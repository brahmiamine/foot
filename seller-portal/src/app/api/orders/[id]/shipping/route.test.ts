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

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/orders/order-1/shipping", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

/** TS-35 — shipping (SellerOrder). */
describe("POST /api/orders/[id]/shipping", () => {
  it("ships a READY_TO_SHIP order and records carrier/tracking/shippedAt", async () => {
    const { POST } = await import("./route");
    const sellerId = randomUUID();
    await seedActiveSeller(sellerId);
    mockSession = sessionFor(sellerId);
    const order = await seedOrder(sellerId, SellerOrderStatus.READY_TO_SHIP);

    const response = await POST(buildRequest({ carrier: "Aramex", trackingNumber: "TRACK-123" }), {
      params: Promise.resolve({ id: order.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order.status).toBe(SellerOrderStatus.SHIPPED);
    expect(body.order.shippingCarrier).toBe("Aramex");
    expect(body.order.trackingNumber).toBe("TRACK-123");
    expect(body.order.shippedAt).toBeTruthy();
  });

  it("rejects shipping an order that isn't READY_TO_SHIP", async () => {
    const { POST } = await import("./route");
    const sellerId = randomUUID();
    await seedActiveSeller(sellerId);
    mockSession = sessionFor(sellerId);
    const order = await seedOrder(sellerId, SellerOrderStatus.PROCESSING);

    const response = await POST(buildRequest({ carrier: "Aramex", trackingNumber: "TRACK-123" }), {
      params: Promise.resolve({ id: order.id }),
    });

    expect(response.status).toBe(409);
  });

  it("rejects a request missing carrier/trackingNumber", async () => {
    const { POST } = await import("./route");
    const sellerId = randomUUID();
    await seedActiveSeller(sellerId);
    mockSession = sessionFor(sellerId);
    const order = await seedOrder(sellerId, SellerOrderStatus.READY_TO_SHIP);

    const response = await POST(buildRequest({ carrier: "" }), {
      params: Promise.resolve({ id: order.id }),
    });

    expect(response.status).toBe(422);
  });

  it("returns 404 (never 403) for another seller's order", async () => {
    const { POST } = await import("./route");
    const ownerId = randomUUID();
    await seedActiveSeller(ownerId);
    const order = await seedOrder(ownerId, SellerOrderStatus.READY_TO_SHIP);
    const otherSellerId = randomUUID();
    await seedActiveSeller(otherSellerId);
    mockSession = sessionFor(otherSellerId);

    const response = await POST(buildRequest({ carrier: "Aramex", trackingNumber: "TRACK-123" }), {
      params: Promise.resolve({ id: order.id }),
    });

    expect(response.status).toBe(404);
  });
});
