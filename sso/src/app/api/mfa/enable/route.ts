import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, issueSession } from "@/lib/session";
import { getDataSource } from "@/lib/db";
import { User } from "@/entities/User";
import { generateRecoveryCodes, hashRecoveryCodes, verifyTotpCode } from "@/lib/mfa";
import { getClientIP } from "@/lib/getClientIP";
import { logSecurityEvent } from "@/lib/securityLog";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const secret = typeof body.secret === "string" ? body.secret : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!secret || !code) {
    return NextResponse.json({ error: "Secret et code requis" }, { status: 400 });
  }

  const valid = await verifyTotpCode(secret, code);
  if (!valid) {
    return NextResponse.json({ error: "Code invalide" }, { status: 400 });
  }

  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const recoveryCodes = generateRecoveryCodes();
  user.mfaSecret = secret;
  user.mfaEnabled = true;
  user.mfaRecoveryCodes = await hashRecoveryCodes(recoveryCodes);
  // Active la MFA = un changement de posture de sécurité du compte : on
  // invalide les sessions déjà émises (voir User.tokenVersion), mais on
  // réémet immédiatement une session à jour ci-dessous pour ne pas
  // déconnecter l'utilisateur qui vient de faire l'action.
  user.tokenVersion += 1;
  await userRepo.save(user);

  console.log(`[MFA] Activée pour le compte ${user.email} (${user.id}).`);
  await logSecurityEvent({ eventType: "MFA_ENABLED", userId: user.id, email: user.email, ip: getClientIP(request) });

  // Codes affichés une seule fois : jamais renvoyés ni consultables ensuite
  // (seul leur hash bcrypt est conservé).
  const response = NextResponse.json({ success: true, recoveryCodes });
  await issueSession(response, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId ?? null,
    tokenVersion: user.tokenVersion,
  });
  return response;
}
