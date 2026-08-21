import { describe, expect, it } from "vitest";
import { canAcceptWithConflictDeclaration } from "./conflictDeclarationPolicy";

describe("referee conflict of interest guard", () => {
  it("blocks acceptance when no declaration exists", () => {
    expect(canAcceptWithConflictDeclaration(null)).toMatch(/déclaration/);
  });

  it("blocks acceptance when a conflict was declared", () => {
    expect(canAcceptWithConflictDeclaration({ hasConflict: true })).toMatch(/conflit d'intérêts/);
  });

  it("allows acceptance once a no-conflict declaration exists", () => {
    expect(canAcceptWithConflictDeclaration({ hasConflict: false })).toBeNull();
  });
});
