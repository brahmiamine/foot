import { describe, expect, it } from "vitest";
import {
  DIRECT_PROFILE_FIELDS,
  SENSITIVE_PROFILE_FIELDS,
  classifyProfileChanges,
} from "./profileChangePolicy";

describe("PLAYER-001 profile change policy", () => {
  it("keeps only the profile image as a direct self-service field", () => {
    expect(DIRECT_PROFILE_FIELDS).toEqual(["imageUrl"]);
  });

  it("requires approval for sporting identity fields", () => {
    expect(SENSITIVE_PROFILE_FIELDS).toEqual([
      "firstNameFr",
      "lastNameFr",
      "firstNameAr",
      "lastNameAr",
      "birthDate",
      "position",
      "number",
      "category",
    ]);
  });

  it("separates direct and approval-required changes and ignores unchanged fields", () => {
    const result = classifyProfileChanges(
      {
        imageUrl: "/uploads/players/new.jpg",
        position: "MIDFIELDER",
        number: 8,
        firstNameFr: "Amine",
      },
      {
        imageUrl: "/uploads/players/old.jpg",
        position: "DEFENDER",
        number: 8,
        firstNameFr: "Amine",
      },
    );

    expect(result.direct).toEqual({ imageUrl: "/uploads/players/new.jpg" });
    expect(result.sensitive).toEqual({ position: "MIDFIELDER" });
  });
});
