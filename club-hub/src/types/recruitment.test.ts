import { describe, expect, it } from "vitest";
import {
  createRecruitmentApplicationSchema,
  normalizeRecruitmentCategory,
  recruitmentRejectionSchema,
  recruitmentTrialSchema,
} from "./recruitment";

const baseApplication = {
  name: "Ali Test",
  birthDate: "2005-02-10",
  category: "U21",
  position: "FORWARD",
  currentClub: "Club A",
  parentPhone: "+21600000000",
  email: "ali@example.com",
  message: "Disponible pour essai",
};

describe("recruitment schemas", () => {
  it("accepts an HTTP(S) scouting video URL", () => {
    const parsed = createRecruitmentApplicationSchema.parse({
      ...baseApplication,
      videoUrl: "https://video.example.com/scouting/123",
    });

    expect(parsed.videoUrl).toBe("https://video.example.com/scouting/123");
  });

  it("rejects non HTTP(S) video schemes", () => {
    expect(() =>
      createRecruitmentApplicationSchema.parse({
        ...baseApplication,
        videoUrl: "javascript:alert(1)",
      }),
    ).toThrow();
  });

  it("requires an offset-aware ISO instant and a trial location", () => {
    expect(() =>
      recruitmentTrialSchema.parse({
        scheduledAt: "2026-08-27T16:00",
        location: "Terrain principal",
      }),
    ).toThrow();

    expect(
      recruitmentTrialSchema.parse({
        scheduledAt: "2026-08-27T16:00:00.000Z",
        location: "Terrain principal",
      }).location,
    ).toBe("Terrain principal");
  });

  it("normalizes a public U15 category to the internal u15 scope", () => {
    expect(normalizeRecruitmentCategory(" U15 ")).toBe("u15");
    expect(normalizeRecruitmentCategory("academy-x")).toBeNull();
  });

  it("requires a meaningful rejection reason", () => {
    expect(() => recruitmentRejectionSchema.parse({ reason: "   " })).toThrow();
    expect(recruitmentRejectionSchema.parse({ reason: "Profil non retenu" }).reason).toBe("Profil non retenu");
  });
});
