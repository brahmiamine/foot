import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, clearSessionCookie } from "@/lib/session";
import { getDataSource } from "@/lib/db";
import { User } from "@/entities/User";
import { revokeAllUserSessions } from "@/lib/sessionRegistry";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/**
 * Invalide toutes les sessions déjà émises pour ce compte, y compris celle
 * qui fait cette requête. `tokenVersion` reste la révocation globale de
 * référence ; le registre est également marqué pour que l'interface ne
 * continue pas d'afficher des sessions devenues invalides.
 */
export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }

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
  await revokeAllUserSessions(user.id);

  console.log(`[Session] Déconnexion de toutes les sessions pour ${user.email} (${user.id}).`);

  const response = NextResponse.json({ success: true });
  return clearSessionCookie(response);
}
