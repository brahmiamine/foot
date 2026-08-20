import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { PlayerProfileChangeRequestService } from "@/services/PlayerProfileChangeRequestService";

const service = new PlayerProfileChangeRequestService();

export async function GET(request: NextRequest) {
  const denied = ensureServiceAuth(request);
  if (denied) return denied;

  const playerId = request.nextUrl.searchParams.get("playerId")?.trim();
  const requesterUserId = request.nextUrl.searchParams.get("requesterUserId")?.trim();
  if (!playerId || !requesterUserId) {
    return NextResponse.json({ error: "playerId et requesterUserId sont requis" }, { status: 400 });
  }

  const requests = await service.listForPlayer(playerId, requesterUserId);
  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const denied = ensureServiceAuth(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null) as null | {
    action?: string;
    playerId?: string;
    requesterUserId?: string;
    imageUrl?: string | null;
    changes?: Record<string, unknown>;
  };
  const playerId = body?.playerId?.trim();
  const requesterUserId = body?.requesterUserId?.trim();
  if (!body || !playerId || !requesterUserId) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  try {
    if (body.action === "UPDATE_DIRECT") {
      const result = await service.updateDirectImage(playerId, requesterUserId, body.imageUrl ?? null);
      return NextResponse.json({ result });
    }
    if (body.action === "SUBMIT_SENSITIVE") {
      const result = await service.submitSensitiveChanges(playerId, requesterUserId, body.changes ?? {});
      return NextResponse.json({ result }, { status: 201 });
    }
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur profil joueur" },
      { status: 409 },
    );
  }
}
