import { describe, expect, it } from "vitest";
import { validateTrainingResponsePolicy } from "./TrainingService";

describe("training response policy", () => {
  const trainingDate = new Date("2026-09-01T18:00:00.000Z");

  it("accepts a deadline before the session", () => {
    expect(() => validateTrainingResponsePolicy(
      trainingDate,
      new Date("2026-09-01T12:00:00.000Z"),
      120,
    )).not.toThrow();
  });

  it("rejects a response deadline after the session", () => {
    expect(() => validateTrainingResponsePolicy(
      trainingDate,
      new Date("2026-09-01T19:00:00.000Z"),
      120,
    )).toThrow("La deadline de réponse doit précéder la séance");
  });

  it("rejects reminder offsets outside the supported seven-day window", () => {
    expect(() => validateTrainingResponsePolicy(trainingDate, null, 10081)).toThrow("Délai de rappel invalide");
  });
});
