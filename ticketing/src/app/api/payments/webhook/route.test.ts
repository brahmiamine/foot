import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const reconcileTicketPayment = vi.fn();
vi.mock("@/lib/tickets", () => ({
  reconcileTicketPayment: (...args: unknown[]) => reconcileTicketPayment(...args),
}));

const claimWebhookEvent = vi.fn();
vi.mock("@/lib/webhookIdempotency", () => ({
  claimWebhookEvent: (...args: unknown[]) => claimWebhookEvent(...args),
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
    expect(reconcileTicketPayment).not.toHaveBeenCalled();
  });

  it("rejects a missing signature header", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({ paymentId: "payment-1" });

    const response = await POST(buildRequest(body));

    expect(response.status).toBe(401);
    expect(reconcileTicketPayment).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({ paymentId: "payment-1" });

    const response = await POST(buildRequest(body, "sha256=deadbeef"));

    expect(response.status).toBe(401);
    expect(reconcileTicketPayment).not.toHaveBeenCalled();
  });

  it("rejects a signature computed with the wrong secret", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({ paymentId: "payment-1" });

    const response = await POST(buildRequest(body, sign("wrong-secret", body)));

    expect(response.status).toBe(401);
    expect(reconcileTicketPayment).not.toHaveBeenCalled();
  });

  it("accepts a validly signed body and reconciles the payment", async () => {
    claimWebhookEvent.mockResolvedValue(true);
    reconcileTicketPayment.mockResolvedValue("PAID");
    const { POST } = await import("./route");
    const body = JSON.stringify({ paymentId: "payment-1", eventId: "event-1", orderId: "ORDER-1" });

    const response = await POST(buildRequest(body, sign("top-secret", body)));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ status: "PAID" });
    expect(claimWebhookEvent).toHaveBeenCalledWith("event-1", "payment-1");
    expect(reconcileTicketPayment).toHaveBeenCalledWith("payment-1");
  });

  it("returns 422 when paymentId is missing from an otherwise validly signed body", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({ eventId: "event-1", orderId: "ORDER-1" });

    const response = await POST(buildRequest(body, sign("top-secret", body)));

    expect(response.status).toBe(422);
    expect(reconcileTicketPayment).not.toHaveBeenCalled();
  });

  it("returns 422 when eventId is missing from an otherwise validly signed body", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({ paymentId: "payment-1", orderId: "ORDER-1" });

    const response = await POST(buildRequest(body, sign("top-secret", body)));

    expect(response.status).toBe(422);
    expect(reconcileTicketPayment).not.toHaveBeenCalled();
    expect(claimWebhookEvent).not.toHaveBeenCalled();
  });

  it("TS-14: acknowledges a retried event without re-running reconciliation", async () => {
    claimWebhookEvent.mockResolvedValue(false);
    const { POST } = await import("./route");
    const body = JSON.stringify({ paymentId: "payment-1", eventId: "event-1", orderId: "ORDER-1" });

    const response = await POST(buildRequest(body, sign("top-secret", body)));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ status: "ALREADY_PROCESSED" });
    expect(claimWebhookEvent).toHaveBeenCalledWith("event-1", "payment-1");
    expect(reconcileTicketPayment).not.toHaveBeenCalled();
  });
});
