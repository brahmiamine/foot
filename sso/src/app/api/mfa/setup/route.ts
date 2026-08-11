import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { buildMfaEnrollment, generateMfaSecret } from "@/lib/mfa";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/**
 * Génère un nouveau secret TOTP et son QR code — pas encore persisté (voir
 * /api/mfa/enable, qui exige un code valide pour ce secret avant de
 * l'enregistrer sur le compte). Le secret transite une seconde fois côté
 * client vers /api/mfa/enable, mais il est déjà présent dans l'URI otpauth
 * du QR code affiché ici : aucune exposition supplémentaire. Un CSRF aveugle
 * sur cette route seule ne mène nulle part (la réponse contenant le secret
 * n'est jamais lisible par un site tiers, protection de même origine) mais
 * la vérification d'origine reste appliquée par cohérence avec le reste de
 * cette revue (voir lib/csrf.ts).
 */
export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }

  const session = await getCurrentSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const secret = generateMfaSecret();
  const { qrCodeDataUrl, otpauthUri } = await buildMfaEnrollment(session.email, secret);

  return NextResponse.json({ secret, qrCodeDataUrl, otpauthUri });
}
