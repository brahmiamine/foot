import { describe, expect, it } from "vitest";
import { PlayerPortalService } from "./PlayerPortalService";

const publicMethods = [
  "getPlayer",
  "resolveConvocationMatch",
  "resolveConvocationMatches",
  "getConvocations",
  "respondToConvocation",
  "getTrainingInvitations",
  "respondToTraining",
  "getStats",
  "getSeasonSummary",
  "getDiscipline",
  "getTrips",
  "respondToTrip",
  "getNextConvocation",
  "getAgenda",
  "getAvailability",
] as const;

describe("PlayerPortalService facade", () => {
  it("preserves the public service contract after splitting capabilities", () => {
    const service = new PlayerPortalService();
    for (const method of publicMethods) {
      expect(typeof service[method]).toBe("function");
    }
  });
});
