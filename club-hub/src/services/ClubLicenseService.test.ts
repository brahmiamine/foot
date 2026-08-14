import { describe, expect, it } from "vitest";
import {
  assertClubLicenseTransition,
  assertRequirementsAllowApproval,
  ClubLicenseWorkflowError,
} from "../../../packages/regulatory-shared/src/clubLicensing";

describe("ClubLicenseService domain rules", () => {
  it("allows a club to submit a correction-requested dossier again", () => {
    expect(() => assertClubLicenseTransition("CHANGES_REQUESTED", "SUBMITTED")).not.toThrow();
  });

  it("does not let a club validate its own dossier", () => {
    expect(() => assertClubLicenseTransition("DRAFT", "APPROVED")).toThrow(ClubLicenseWorkflowError);
    expect(() => assertClubLicenseTransition("CHANGES_REQUESTED", "APPROVED")).toThrow(ClubLicenseWorkflowError);
  });

  it("accepts approval only when every mandatory requirement is compliant or explicitly waived", () => {
    expect(() => assertRequirementsAllowApproval([
      { mandatory: true, status: "COMPLIANT" },
      { mandatory: true, status: "WAIVED", waiverReason: "Dérogation comité" },
      { mandatory: false, status: "NON_COMPLIANT" },
    ])).not.toThrow();
  });
});
