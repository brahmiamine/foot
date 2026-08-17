import { NextRequest, NextResponse } from "next/server";
import {
  AccountInvitationError,
  acceptAccountInvitation,
} from "@/lib/accountInvitation";
import { getClientIP } from "@/lib/getClientIP";

export const runtime = "nodejs";
const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token) return NextResponse.json({ error: "Jeton requis" }, { status: 400 });
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères` },
        { status: 400 },
      );
    }

    const result = await acceptAccountInvitation(token, password);
    if (!result.success) {
      return NextResponse.json(
        { error: "Ce lien d'activation est invalide ou a expiré." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, role: result.role });
  } catch (error) {
    if (error instanceof AccountInvitationError) {
      return NextResponse.json(
        { error: "Ce lien d'activation n'est plus utilisable." },
        { status: 400 },
      );
    }
    console.error("Identity account invitation acceptance error:", {
      error,
      ip: getClientIP(request),
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
