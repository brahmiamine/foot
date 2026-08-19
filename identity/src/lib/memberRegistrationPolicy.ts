export type MemberRegistrationMode =
  | "OPEN"
  | "EMAIL_VERIFICATION"
  | "CLUB_APPROVAL"
  | "INVITE_ONLY"
  | "CLOSED";

export type MemberRegistrationDecision =
  | "CREATE_ACTIVE"
  | "PENDING_EMAIL_VERIFICATION"
  | "PENDING_CLUB_APPROVAL"
  | "REQUIRE_INVITATION"
  | "REJECT";

/** Pure policy decision shared by password and OAuth registration paths. */
export function decideMemberRegistration(input: {
  mode: MemberRegistrationMode;
  hasValidInvitation: boolean;
  emailVerifiedByProvider: boolean;
}): MemberRegistrationDecision {
  switch (input.mode) {
    case "OPEN":
      return "CREATE_ACTIVE";
    case "EMAIL_VERIFICATION":
      return input.emailVerifiedByProvider ? "CREATE_ACTIVE" : "PENDING_EMAIL_VERIFICATION";
    case "CLUB_APPROVAL":
      return "PENDING_CLUB_APPROVAL";
    case "INVITE_ONLY":
      return input.hasValidInvitation ? "CREATE_ACTIVE" : "REQUIRE_INVITATION";
    case "CLOSED":
      return "REJECT";
  }
}
