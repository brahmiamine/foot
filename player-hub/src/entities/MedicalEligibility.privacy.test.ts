import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { getMetadataArgsStorage } from "typeorm";
import { MedicalEligibility } from "./MedicalEligibility";

const FORBIDDEN_MEDICAL_FIELDS = [
  "examinationDate",
  "validatedByMedicalUserId",
  "validatedAt",
  "certificateReference",
  "documentUrl",
  "createdBy",
];

describe("player medical eligibility privacy boundary", () => {
  it("only exposes the FIT/UNFIT status and expiry, never the review trail or certificate", () => {
    const mapped = getMetadataArgsStorage()
      .columns.filter((column) => column.target === MedicalEligibility)
      .map((column) => column.propertyName);

    for (const field of FORBIDDEN_MEDICAL_FIELDS) {
      expect(mapped).not.toContain(field);
    }
  });
});
