import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { buildMfaEnrollment, createMfaEnrollmentChallenge, generateMfaSecret } from "@/lib/mfa";
import { getMfaRolePolicy } from "@/lib/mfaPolicy";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/** Self-service enrollment for any authenticated role whose policy allows MFA. */
export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const policy = await getMfaRolePolicy(session.role);
  if (policy.mode === "DISABLED") {
    return NextResponse.json({ error: "MFA_ENROLLMENT_DISABLED" }, { status: 403 });
  }

  const secret = generateMfaSecret();
  await createMfaEnrollmentChallenge(session.id, secret);
  const { qrCodeDataUrl, otpauthUri } = await buildMfaEnrollment(session.email, secret);

  return NextResponse.json({ secret, qrCodeDataUrl, otpauthUri });
}
