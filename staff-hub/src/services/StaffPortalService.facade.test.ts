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
] as const;

describe("StaffPortalService facade", () => {
  it("preserves the public service contract after splitting capabilities", () => {
    const service = new StaffPortalService();
    for (const method of publicMethods) {
      expect(typeof service[method]).toBe("function");
    }
  });
});
