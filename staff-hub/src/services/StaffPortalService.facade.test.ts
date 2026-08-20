import { describe, expect, it } from "vitest";
import { StaffPortalService } from "./StaffPortalService";

const publicMethods = [
  "getRoster",
  "getStaffList",
  "getAvailability",
  "listMatches",
  "createFriendlyMatch",
  "listTrainings",
  "createTraining",
  "cancelTraining",
  "getInvitationsForTraining",
  "inviteRosterToTraining",
  "setAttendance",
  "getAttendanceReport",
  "listConvocations",
  "resolveConvocationMatch",
  "resolveConvocationMatches",
  "getConvocationsForMatch",
  "createConvocations",
  "getFormation",
  "setFormation",
  "getLineup",
  "setLineupEntry",
  "removeLineupEntry",
  "listTacticsBoards",
  "listStats",
  "createStat",
  "listTrips",
  "createTrip",
  "getTripParticipants",
  "addRosterToTrip",
  "getNextTraining",
  "getNextMatch",
  "getAgenda",
  "resolveKickoff",
  "getLineupLockPolicy",
  "updateLineupLockPolicy",
  "isLineupAutoLocked",
  "getTrainingApprovalPolicy",
  "updateTrainingApprovalPolicy",
  "getStatReviewPolicy",
  "updateStatReviewPolicy",
  "auditStatCorrection",
  "grantHeadCoachDelegation",
  "revokeHeadCoachDelegation",
  "listHeadCoachDelegations",
  "isHeadCoachDelegated",
  "submitTrainingPlan",
  "approveTrainingPlan",
  "updateStat",
] as const;

describe("StaffPortalService facade", () => {
  it("preserves the public service contract after splitting capabilities", () => {
    const service = new StaffPortalService();
    for (const method of publicMethods) {
      expect(typeof service[method]).toBe("function");
    }
  });
});
