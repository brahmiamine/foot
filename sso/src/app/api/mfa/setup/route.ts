import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { buildMfaEnrollment, createMfaEnrollmentChallenge, generateMfaSecret } from "@/lib/mfa";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/**
 * Génère un nouveau secret TOTP et son QR code, et le stocke côté serveur
 * (createMfaEnrollmentChallenge, expire après 10 min) : /api/mfa/enable n'a
 * plus besoin que le client le lui reposte, voir avancement.md, "sso" —
 * durcir l'enrôlement MFA. `secret` reste renvoyé ici pour l'affichage en
 * saisie manuelle (à côté du QR code) — c'est un affichage, pas un
 * round-trip, le client ne le retransmet plus. Un CSRF aveugle sur cette
 * route seule ne mène nulle part (la réponse n'est jamais lisible par un
 * site tiers, protection de même origine) mais la vérification d'origine
 * reste appliquée par cohérence avec le reste de cette revue (voir
 * lib/csrf.ts).
 */
export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const session = await getCurrentSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 403 });
  }

  const secret = generateMfaSecret();
  await createMfaEnrollmentChallenge(session.id, secret);
  const { qrCodeDataUrl, otpauthUri } = await buildMfaEnrollment(session.email, secret);

  return NextResponse.json({ secret, qrCodeDataUrl, otpauthUri });
}
