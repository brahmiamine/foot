import { describe, expect, it } from "vitest";
import {
  calculatePredictionResultPoints,
  canSubmitPrediction,
  isCommunityReaction,
  normalizeCommunityText,
  normalizeHttpsImageUrl,
  parsePredictionScore,
  safeCommunityReturnPath,
} from "./communityRules";

describe("communityRules", () => {
  it("scores outcome, exact score and first scorer independently", () => {
    expect(calculatePredictionResultPoints(
      { homeScore: 2, awayScore: 1, firstScorerId: "p1" },
      { homeScore: 2, awayScore: 1, firstScorerId: "p1" },
    )).toBe(80);
    expect(calculatePredictionResultPoints(
      { homeScore: 3, awayScore: 1 },
      { homeScore: 2, awayScore: 0 },
    )).toBe(20);
    expect(calculatePredictionResultPoints(
      { homeScore: 0, awayScore: 1 },
      { homeScore: 1, awayScore: 0 },
    )).toBe(0);
  });

  it("locks predictions at kickoff", () => {
    const now = new Date("2026-08-17T20:00:00Z");
    expect(canSubmitPrediction("UPCOMING", "2026-08-17T21:00:00Z", now)).toBe(true);
    expect(canSubmitPrediction("UPCOMING", "2026-08-17T20:00:00Z", now)).toBe(false);
    expect(canSubmitPrediction("FINISHED", "2026-08-18T20:00:00Z", now)).toBe(false);
  });

  it("validates score boundaries", () => {
    expect(parsePredictionScore("0")).toBe(0);
    expect(parsePredictionScore("20")).toBe(20);
    expect(() => parsePredictionScore("21")).toThrow("INVALID_SCORE");
    expect(() => parsePredictionScore("1.5")).toThrow("INVALID_SCORE");
  });

  it("normalizes text and HTTPS media only", () => {
    expect(normalizeCommunityText("  Vive OB !  ", 50)).toBe("Vive OB !");
    expect(() => normalizeCommunityText("   ", 50)).toThrow("INVALID_TEXT");
    expect(normalizeHttpsImageUrl("https://cdn.example.com/photo.jpg")).toBe("https://cdn.example.com/photo.jpg");
    expect(() => normalizeHttpsImageUrl("http://example.com/photo.jpg")).toThrow("INVALID_IMAGE_URL");
  });

  it("accepts only supported reactions and closed return paths", () => {
    expect(isCommunityReaction("BRAVO")).toBe(true);
    expect(isCommunityReaction("ANGRY")).toBe(false);
    expect(safeCommunityReturnPath("/espace-membre/communaute")).toBe("/espace-membre/communaute");
    expect(safeCommunityReturnPath("https://evil.example")).toBe("/communaute");
  });
});
