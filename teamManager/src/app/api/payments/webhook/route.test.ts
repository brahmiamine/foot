import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const reconcileOrderPayment = vi.fn();
vi.mock("@/services/ShopOrderService", () => ({
  reconcileOrderPayment: (...args: unknown[]) => reconcileOrderPayment(...args),
}));

const envBackup = { ...process.env };
afterEach(() => {
  process.env = { ...envBackup };
  vi.resetAllMocks();
});

function buildRequest(body: string, signature?: string) {
  return new NextRequest("http://localhost/api/payments/webhook", {
    method: "POST",
    body,
    headers: signature ? { "x-payment-signature": signature } : undefined,
  });
}

function sign(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("POST /api/payments/webhook", () => {
  beforeEach(() => {
    process.env.PAYMENT_WEBHOOK_SECRET = "top-secret";
  });

  it("rejects the request when PAYMENT_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.PAYMENT_WEBHOOK_SECRET;
    const { POST } = await import("./route");
    const body = JSON.stringify({ paymentId: "payment-1" });

    const response = await POST(buildRequest(body, sign("top-secret", body)));

    expect(response.status).toBe(401);
    expect(reconcileOrderPayment).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({ paymentId: "payment-1" });

    const response = await POST(buildRequest(body, "sha256=deadbeef"));

    expect(response.status).toBe(401);
    expect(reconcileOrderPayment).not.toHaveBeenCalled();
  });

  it("accepts a validly signed body and reconciles the payment", async () => {
    reconcileOrderPayment.mockResolvedValue("PAID");
    const { POST } = await import("./route");
    const body = JSON.stringify({ paymentId: "payment-1", orderId: "ORDER-1" });

    const response = await POST(buildRequest(body, sign("top-secret", body)));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ status: "PAID" });
    expect(reconcileOrderPayment).toHaveBeenCalledWith("payment-1");
  });

  it("returns 422 when paymentId is missing from an otherwise validly signed body", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({ orderId: "ORDER-1" });

    const response = await POST(buildRequest(body, sign("top-secret", body)));

    expect(response.status).toBe(422);
    expect(reconcileOrderPayment).not.toHaveBeenCalled();
  });
});
