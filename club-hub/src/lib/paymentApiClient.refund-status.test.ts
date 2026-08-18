import { describe, expect, it } from "vitest";
import { normalizeRefundStatus } from "./paymentApiClient";

describe("normalizeRefundStatus", () => {
  it("keeps centrally awaiting refunds pending in the local reconciliation queue", () => {
    expect(normalizeRefundStatus("AWAITING_APPROVAL")).toBe("REQUESTED");
  });

  it("preserves known refund states", () => {
    expect(normalizeRefundStatus("REQUESTED")).toBe("REQUESTED");
    expect(normalizeRefundStatus("SUCCEEDED")).toBe("SUCCEEDED");
    expect(normalizeRefundStatus("FAILED")).toBe("FAILED");
  });

  it("rejects unknown payment-service states", () => {
    expect(normalizeRefundStatus("UNKNOWN_PROVIDER_STATE")).toBeNull();
  });
});
