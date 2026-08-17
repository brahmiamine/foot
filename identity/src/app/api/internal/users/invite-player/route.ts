import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import {
  AccountInvitationError,
  invitePlayerAccount,
} from "@/lib/accountInvitation";

export const runtime = "nodejs";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Provisionnement PLAYER uniquement. Les rôles élevés ne sont volontairement
 * pas paramétrables par le caller de cet endpoint.
 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const teamId = typeof body?.teamId === "string" ? body.teamId.trim() : "";
    const playerId = typeof body?.playerId === "string" ? body.playerId.trim() : "";
    const invitedByUserId =
      typeof body?.invitedByUserId === "string" ? body.invitedByUserId.trim() : null;

    if (!name || !email || !teamId || !playerId) {
      return NextResponse.json(
        { error: "name, email, teamId et playerId requis" },
        { status: 400 },
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: "email invalide" }, { status: 400 });
    }

    const invitation = await invitePlayerAccount({
      name,
      email,
      teamId,
      playerId,
      invitedByUserId,
    });
    return NextResponse.json(
      { ...invitation, expiresAt: invitation.expiresAt.toISOString() },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AccountInvitationError) {
      const status = error.code === "PLAYER_ACCOUNT_ACTIVE" ? 409 : 409;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    console.error("Identity invite-player error:", error);
    return NextResponse.json({ error: "Erreur lors de l'invitation du joueur" }, { status: 500 });
  }
}
