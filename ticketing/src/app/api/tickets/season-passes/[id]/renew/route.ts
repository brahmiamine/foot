import { NextRequest, NextResponse } from "next/server";
import { getSsoSession } from "@/lib/ssoSession";
import { SeasonPassService } from "@/services/SeasonPassService";
import { UnauthorizedError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

const service = new SeasonPassService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSsoSession();
    if (!session) throw new UnauthorizedError("Connexion requise.");
    const { id } = await params;
    const seasonPass = await service.renew(id, session.id);
    return NextResponse.json({ seasonPass }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
