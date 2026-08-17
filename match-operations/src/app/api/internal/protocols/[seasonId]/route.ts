import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import {
  CompetitionMatchProtocolService,
  type UpdateCompetitionMatchProtocolInput,
} from "@/services/CompetitionMatchProtocolService";

export const runtime = "nodejs";

const service = new CompetitionMatchProtocolService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> },
) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { seasonId } = await params;
    return NextResponse.json(await service.getForSeason(seasonId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de lire le protocole" },
      { status: 400 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> },
) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { seasonId } = await params;
    const body = (await request.json()) as UpdateCompetitionMatchProtocolInput;
    const actorUserId = request.headers.get("x-actor-user-id")?.trim() || "service:federation-hub";
    const protocol = await service.updateForSeason(seasonId, body, actorUserId);
    return NextResponse.json(protocol);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de modifier le protocole" },
      { status: 400 },
    );
  }
}
