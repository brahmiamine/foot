import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/db";
import { User } from "@/entities/User";
import {
  buildMfaEnrollment,
  createMfaEnrollmentChallenge,
  generateMfaSecret,
} from "@/lib/mfa";
import { getMfaRolePolicy } from "@/lib/mfaPolicy";
import { verifyMfaPendingClaims } from "@/lib/mfaPendingToken";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/**
 * Démarre un enrôlement MFA après mot de passe valide mais AVANT émission
 * d'une vraie session. Le jeton ENROLL ne peut pas être utilisé sur le flux
 * de vérification MFA normal.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const mfaToken = typeof body?.mfaToken === "string" ? body.mfaToken : "";
    const claims = mfaToken ? await verifyMfaPendingClaims(mfaToken) : null;
    if (!claims || claims.purpose !== "ENROLL") {
      return NextResponse.json({ error: "MFA_SESSION_EXPIRED" }, { status: 401 });
    }

    const dataSource = await getDataSource();
    const user = await dataSource.getRepository(User).findOne({ where: { id: claims.userId } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "MFA_SESSION_EXPIRED" }, { status: 401 });
    }
    if (user.mfaEnabled && user.mfaSecret) {
      return NextResponse.json({ error: "MFA_ALREADY_ENABLED" }, { status: 409 });
    }

    const policy = await getMfaRolePolicy(user.role);
    if (policy.mode === "DISABLED") {
      return NextResponse.json({ error: "MFA_ENROLLMENT_DISABLED" }, { status: 403 });
    }

    const secret = generateMfaSecret();
    await createMfaEnrollmentChallenge(user.id, secret);
    const enrollment = await buildMfaEnrollment(user.email, secret);
    return NextResponse.json({
      success: true,
      qrCodeDataUrl: enrollment.qrCodeDataUrl,
      otpauthUri: enrollment.otpauthUri,
    });
  } catch (error) {
    console.error("MFA pre-auth enrollment setup error:", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
