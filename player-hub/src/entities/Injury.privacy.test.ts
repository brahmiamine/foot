import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { getMetadataArgsStorage } from "typeorm";
import { Injury } from "./Injury";

const FORBIDDEN_MEDICAL_FIELDS = ["diagnosis", "description", "documents", "notes", "progressiveReturnNotes"];

describe("player injury privacy boundary", () => {
  it("does not map clinical diagnosis, documents or notes into player-hub", () => {
    const mapped = getMetadataArgsStorage()
      .columns.filter((column) => column.target === Injury)
      .map((column) => column.propertyName);

    for (const field of FORBIDDEN_MEDICAL_FIELDS) {
      expect(mapped).not.toContain(field);
    }
  });
});
