import { describe, expect, it } from "vitest";
import { assignmentBucket, resolveAssignmentFilter, roleLabel } from "./assignmentView";

describe("assignment view helpers", () => {
  const now = new Date("2026-08-14T10:00:00Z");

  it("prioritizes revoked assignments", () => {
    expect(assignmentBucket("REVOKED", "UPCOMING", new Date("2026-08-20T10:00:00Z"), now)).toBe("revoked");
  });

  it("classifies active assignments without a date as upcoming", () => {
    expect(assignmentBucket("ACTIVE", "UPCOMING", null, now)).toBe("upcoming");
  });

  it("classifies finished and elapsed matches as past", () => {
    expect(assignmentBucket("ACTIVE", "FINISHED", new Date("2026-08-20T10:00:00Z"), now)).toBe("past");
    expect(assignmentBucket("ACTIVE", "UPCOMING", new Date("2026-08-13T10:00:00Z"), now)).toBe("past");
  });

  it("keeps an in-progress match visible even after its scheduled kickoff", () => {
    expect(assignmentBucket("ACTIVE", "IN_PROGRESS", new Date("2026-08-13T10:00:00Z"), now)).toBe("upcoming");
  });

  it("falls back to the upcoming filter and translates roles", () => {
    expect(resolveAssignmentFilter("invalid")).toBe("upcoming");
    expect(roleLabel("CENTER_REFEREE", "ar")).toBe("حكم ساحة");
  });
});
