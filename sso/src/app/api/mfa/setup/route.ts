import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { buildMfaEnrollment, generateMfaSecret } from "@/lib/mfa";

export const runtime = "nodejs";

/**
 * Génère un nouveau secret TOTP et son QR code — pas encore persisté (voir
 * /api/mfa/enable, qui exige un code valide pour ce secret avant de
 * l'enregistrer sur le compte). Le secret transite une seconde fois côté
 * client vers /api/mfa/enable, mais il est déjà présent dans l'URI otpauth
 * du QR code affiché ici : aucune exposition supplémentaire.
 */
export async function POST() {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const secret = generateMfaSecret();
  const { qrCodeDataUrl, otpauthUri } = await buildMfaEnrollment(session.email, secret);

  return NextResponse.json({ secret, qrCodeDataUrl, otpauthUri });
}
