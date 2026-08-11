import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, clearSessionCookie } from "@/lib/session";
import { getDataSource } from "@/lib/db";
import { User } from "@/entities/User";
import { getClientIP } from "@/lib/getClientIP";
import { logSecurityEvent } from "@/lib/securityLog";

export const runtime = "nodejs";

/**
 * Invalide toutes les sessions déjà émises pour ce compte, y compris celle
 * qui fait cette requête (contrairement à MFA enable/disable, qui réémet
 * une session à jour) — c'est le but explicite de l'action.
 */
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  user.tokenVersion += 1;
  await userRepo.save(user);

  console.log(`[Session] Déconnexion de toutes les sessions pour ${user.email} (${user.id}).`);
  await logSecurityEvent({ eventType: "SESSION_REVOKED", userId: user.id, email: user.email, ip: getClientIP(request) });

  const response = NextResponse.json({ success: true });
  return clearSessionCookie(response);
}
