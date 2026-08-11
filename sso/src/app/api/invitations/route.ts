import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { createClubInvitation } from "@/lib/clubInvitations";

export const runtime = "nodejs";

const ERROR_MESSAGES: Record<string, string> = {
  email_taken: "Un compte existe déjà avec cet email.",
};

/**
 * Déclenche une invitation club. Seuls SUPERADMIN (n'importe quel club, rôle
 * ADMIN ou OBSERVATEUR) et ADMIN (son propre club uniquement, rôle
 * OBSERVATEUR uniquement) peuvent inviter — même restriction que
 * `UserService.create` de `teamManager` (« seul un accès direct à la base
 * peut créer un second ADMIN, pour éviter qu'un compte délégué
 * s'auto-promeuve »).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== "SUPERADMIN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const requestedRole = typeof body.role === "string" ? body.role : "OBSERVATEUR";
    const requestedTeamId = typeof body.teamId === "string" ? body.teamId : "";

    if (!email || (requestedRole !== "ADMIN" && requestedRole !== "OBSERVATEUR")) {
      return NextResponse.json({ error: "Email et rôle valides requis" }, { status: 400 });
    }

    let teamId: string;
    let role: "ADMIN" | "OBSERVATEUR";

    if (session.role === "SUPERADMIN") {
      if (!requestedTeamId) {
        return NextResponse.json({ error: "Club requis" }, { status: 400 });
      }
      teamId = requestedTeamId;
      role = requestedRole;
    } else {
      // ADMIN : club et rôle imposés, ignore toute valeur reçue qui différerait.
      if (!session.teamId) {
        return NextResponse.json({ error: "Compte non rattaché à un club" }, { status: 403 });
      }
      if (requestedRole !== "OBSERVATEUR") {
        return NextResponse.json(
          { error: "Seul un SUPERADMIN peut inviter avec le rôle ADMIN" },
          { status: 403 }
        );
      }
      if (requestedTeamId && requestedTeamId !== session.teamId) {
        return NextResponse.json({ error: "Vous ne pouvez inviter que pour votre propre club" }, { status: 403 });
      }
      teamId = session.teamId;
      role = "OBSERVATEUR";
    }

    const result = await createClubInvitation({ email, teamId, role, invitedByUserId: session.id });
    if (!result.ok) {
      return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SSO club invitation error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
