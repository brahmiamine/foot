import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentSession, issueSession } from "@/lib/session";
import { getDataSource } from "@/lib/db";
import { User } from "@/entities/User";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/**
 * Exige le mot de passe (pas seulement la session active) pour désactiver
 * la MFA — déjà résistant à un CSRF aveugle. Vérification d'origine ajoutée
 * par cohérence avec le reste de cette revue (voir lib/csrf.ts).
 */
export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await request.json();
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "CURRENT_PASSWORD_REQUIRED" }, { status: 400 });
  }

  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 404 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "INVALID_CURRENT_PASSWORD" }, { status: 401 });
  }

  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.mfaRecoveryCodes = null;
  // Même raisonnement qu'à l'activation : changement de posture de
  // sécurité, on invalide les sessions déjà émises puis on réémet
  // immédiatement une session à jour pour ne pas déconnecter l'utilisateur.
  user.tokenVersion += 1;
  await userRepo.save(user);

  console.log(`[MFA] Désactivée pour le compte ${user.email} (${user.id}).`);

  const response = NextResponse.json({ success: true });
  await issueSession(response, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId ?? null,
    federationId: user.federationId ?? null,
    leagueId: user.leagueId ?? null,
    tokenVersion: user.tokenVersion,
  });
  return response;
}
