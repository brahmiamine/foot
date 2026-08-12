import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Introspection de session pour les apps clientes (matchsheet, superadmin,
 * teamManager, ob, billetterie, arbinote) : jusqu'ici elles vérifiaient
 * seulement signature/issuer/expiration (packages/auth-shared, Edge-safe,
 * sans DB) et pouvaient donc accepter un JWT révoqué (mot de passe changé,
 * MFA modifiée, déconnexion partout) jusqu'à 12h, le temps qu'il expire —
 * voir avancement.md, "Propagation de la révocation de session". Cet
 * endpoint expose la vérification `tokenVersion` déjà faite en interne par
 * `sso` (verifySessionToken, voir src/lib/session.ts) pour que les apps
 * clientes puissent fermer ce circuit.
 *
 * GET plutôt que POST : lecture seule, aucun effet de bord, le jeton lui-
 * même est le seul secret requis (un jeton invalide/forgé renvoie
 * simplement { active: false }, ce n'est pas un oracle exploitable).
 * `Authorization: Bearer <token>` uniquement — jamais le cookie de session
 * du navigateur qui appelle cette route : c'est un appel serveur-à-serveur,
 * voir packages/auth-shared/README.md pour la convention utilisée côté
 * apps clientes.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Authorization: Bearer <token> requis" }, { status: 400 });
  }

  const user = await verifySessionToken(token);
  if (!user) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({
    active: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
    },
  });
}
