import { describe, expect, it } from "vitest";
import {
  createSponsorRequestSchema,
  sponsorContractDraftSchema,
  sponsorRejectionSchema,
  sponsorshipGovernanceSchema,
} from "./sponsors";

describe("sponsorship input schemas", () => {
  it("accepts a complete governed contract and coerces the amount", () => {
    const parsed = sponsorContractDraftSchema.parse({
      level: "OR",
      logoSize: "LARGE",
      logoPlacement: ["HOME", "MATCH_PAGES"],
      contractStart: "2026-09-01",
      contractEnd: "2027-06-30",
      contractAmount: "125000.500",
      notes: "Contrat principal",
    });

    expect(parsed.contractAmount).toBe(125000.5);
    expect(parsed.logoPlacement).toEqual(["HOME", "MATCH_PAGES"]);
  });

  it("rejects a reversed or zero-length contract window", () => {
    const input = {
      level: "LOCAL",
      logoSize: "SMALL",
      logoPlacement: [],
      contractStart: "2026-09-01",
      contractEnd: "2026-09-01",
      contractAmount: "100",
    };

    expect(() => sponsorContractDraftSchema.parse(input)).toThrow();
  });

  it("rejects negative or excessive contract amounts and thresholds", () => {
    expect(() => sponsorshipGovernanceSchema.parse({ dualApprovalThreshold: "-1" })).toThrow();
    expect(() => sponsorContractDraftSchema.parse({
      level: "LOCAL",
      logoSize: "SMALL",
      logoPlacement: [],
      contractStart: "2026-09-01",
      contractEnd: "2027-01-01",
      contractAmount: "1000000000",
    })).toThrow();
  });

  it("requires a meaningful rejection reason", () => {
    expect(() => sponsorRejectionSchema.parse({ reason: "no" })).toThrow();
    expect(sponsorRejectionSchema.parse({ reason: "Budget insuffisant" }).reason).toBe("Budget insuffisant");
  });

  it("rejects protocol-relative public logo paths", () => {
    expect(() => createSponsorRequestSchema.parse({
      companyName: "Partner",
      contactName: "Contact",
      email: "partner@example.com",
      logoUrl: "//evil.example/logo.png",
    })).toThrow();
  });
});
