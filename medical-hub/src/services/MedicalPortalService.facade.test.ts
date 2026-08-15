import { describe, expect, it } from "vitest";
import { MedicalPortalService } from "./MedicalPortalService";

const publicMethods = [
  "rosterInCategories",
  "listInjuries",
  "getInjury",
  "createInjury",
  "updateInjury",
  "appendFollowUpNote",
  "addDocument",
  "getDocuments",
  "getUnavailablePlayers",
  "getAlerts",
  "getAvailabilitySummary",
] as const;

describe("MedicalPortalService facade", () => {
  it("preserves the public service contract after splitting responsibilities", () => {
    const service = new MedicalPortalService();
    for (const method of publicMethods) {
      expect(typeof service[method]).toBe("function");
    }
  });
});
