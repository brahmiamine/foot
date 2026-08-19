import { describe, expect, it } from "vitest";
import {
  decideMemberRegistration,
  type MemberRegistrationMode,
} from "./memberRegistrationPolicy";

describe("ID-004 member registration policy", () => {
  it.each([
    ["OPEN", "CREATE_ACTIVE"],
    ["EMAIL_VERIFICATION", "PENDING_EMAIL_VERIFICATION"],
    ["CLUB_APPROVAL", "PENDING_CLUB_APPROVAL"],
    ["INVITE_ONLY", "REQUIRE_INVITATION"],
    ["CLOSED", "REJECT"],
  ] satisfies Array<[MemberRegistrationMode, string]>) (
    "maps %s to its enforced server decision",
    (mode, expected) => {
      expect(decideMemberRegistration({ mode, hasValidInvitation: false, emailVerifiedByProvider: false })).toBe(expected);
    },
  );

  it("treats a verified Google email as satisfying EMAIL_VERIFICATION", () => {
    expect(
      decideMemberRegistration({
        mode: "EMAIL_VERIFICATION",
        hasValidInvitation: false,
        emailVerifiedByProvider: true,
      }),
    ).toBe("CREATE_ACTIVE");
  });

  it("allows INVITE_ONLY only with a valid one-time invitation", () => {
    expect(
      decideMemberRegistration({
        mode: "INVITE_ONLY",
        hasValidInvitation: true,
        emailVerifiedByProvider: false,
      }),
    ).toBe("CREATE_ACTIVE");
  });
});
