import { describe, expect, it } from "vitest";
import { normalizeRefundStatus } from "./paymentApiClient";

describe("normalizeRefundStatus", () => {
  it("keeps centrally awaiting refunds pending in the local reconciliation queue", () => {
    expect(normalizeRefundStatus("AWAITING_APPROVAL")).toBe("REQUESTED");
  });

  it("preserves known terminal and operational statuses", () => {
    expect(normalizeRefundStatus("PROCESSING")).toBe("PROCESSING");
    expect(normalizeRefundStatus("SUCCEEDED")).toBe("SUCCEEDED");
    expect(normalizeRefundStatus("FAILED")).toBe("FAILED");
    expect(normalizeRefundStatus("MANUAL_REVIEW")).toBe("MANUAL_REVIEW");
  });

  it("rejects unknown payment-service states instead of casting them blindly", () => {
    expect(normalizeRefundStatus("SOMETHING_NEW")).toBeNull();
    expect(normalizeRefundStatus(undefined)).toBeNull();
  });
});
