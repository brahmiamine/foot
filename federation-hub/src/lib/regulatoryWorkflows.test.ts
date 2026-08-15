import { describe,expect,it } from "vitest";import { assertCompetitionRegistrationApproval,assertCompetitionRegistrationTransition } from "../../../packages/regulatory-shared/src/competitionRegistration";import { assertTransferException,isTransferWindowOpen } from "../../../packages/regulatory-shared/src/transferWindow";import { fitsAgeCategory } from "../../../packages/regulatory-shared/src/eligibility";
describe("migration-v2 regulatory rules",()=>{it("rejects an invalid competition entry approval",()=>{expect(()=>assertCompetitionRegistrationApproval({clubLicenseApproved:true,documentsComplete:false,participationBlocked:false,stadiumRequired:false,financialComplianceRequired:false})).toThrow(/incomplet/)});it("enforces entry transitions",()=>{expect(()=>assertCompetitionRegistrationTransition("DRAFT","APPROVED")).toThrow(/interdite/)});it("opens a window only inside its dates",()=>{expect(isTransferWindowOpen({status:"OPEN",opensAt:"2026-01-01",closesAt:"2026-01-31"},new Date("2026-01-15"))).toBe(true);expect(isTransferWindowOpen({status:"OPEN",opensAt:"2026-01-01",closesAt:"2026-01-31"},new Date("2026-02-01"))).toBe(false)});it("requires an auditable exception",()=>{expect(()=>assertTransferException({reason:"cas FIFA"})).toThrow(/référence/)});it("applies youth age limits",()=>{expect(fitsAgeCategory("u17","2010-08-01",new Date("2026-08-14"))).toBe(true);expect(fitsAgeCategory("u17","2008-01-01",new Date("2026-08-14"))).toBe(false)})});

describe("assertCompetitionRegistrationApproval (migration-v2 P0-006/P0-009)", () => {
  const base = {
    clubLicenseApproved: true,
    documentsComplete: true,
    participationBlocked: false,
    stadiumRequired: false,
    financialComplianceRequired: false,
    feesAmount: null as string | null,
    feesPaymentId: null as string | null,
  };

  it("rejects approval when the club is under an active COMPETITION_BAN/COMPETITION_EXCLUSION", () => {
    expect(() => assertCompetitionRegistrationApproval({ ...base, participationBlocked: true })).toThrow(/interdiction de participation/i);
  });

  it("rejects approval without a valid, non-expired club license", () => {
    expect(() => assertCompetitionRegistrationApproval({ ...base, clubLicenseApproved: false })).toThrow(/licence club/i);
    expect(() => assertCompetitionRegistrationApproval({ ...base, clubLicenseExpiresAt: "2020-01-01" }, new Date("2026-01-01"))).toThrow(/licence club/i);
  });

  it("requires a stadium approval id when the season mandates one", () => {
    expect(() => assertCompetitionRegistrationApproval({ ...base, stadiumRequired: true })).toThrow(/stade/i);
    expect(() => assertCompetitionRegistrationApproval({ ...base, stadiumRequired: true, stadiumApprovalId: "s1" })).not.toThrow();
  });

  it("requires a financial compliance id when the season mandates one", () => {
    expect(() => assertCompetitionRegistrationApproval({ ...base, financialComplianceRequired: true })).toThrow(/conformité financière/i);
    expect(() => assertCompetitionRegistrationApproval({ ...base, financialComplianceRequired: true, financialComplianceId: "f1" })).not.toThrow();
  });

  it("requires a payment id whenever fees are due, never when they are zero/null", () => {
    expect(() => assertCompetitionRegistrationApproval({ ...base, feesAmount: "500" })).toThrow(/droits d'engagement/i);
    expect(() => assertCompetitionRegistrationApproval({ ...base, feesAmount: "500", feesPaymentId: "p1" })).not.toThrow();
    expect(() => assertCompetitionRegistrationApproval({ ...base, feesAmount: "0" })).not.toThrow();
  });
});
