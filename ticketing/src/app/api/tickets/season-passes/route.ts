import { NextRequest, NextResponse } from "next/server";
import { getSsoSession } from "@/lib/ssoSession";
import { SeasonPassService } from "@/services/SeasonPassService";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

const service = new SeasonPassService();

// GET /api/tickets/season-passes — mes abonnements saison.
export async function GET() {
  try {
    const session = await getSsoSession();
    if (!session) throw new UnauthorizedError("Connexion requise.");
    const seasonPasses = await service.listMine(session.id);
    return NextResponse.json({ seasonPasses });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/tickets/season-passes { clubId, categoryId }
export async function POST(request: NextRequest) {
  try {
    const session = await getSsoSession();
    if (!session) throw new UnauthorizedError("Connexion requise.");
    if (session.role !== "MEMBER") throw new ForbiddenError("Seul un compte membre peut souscrire un abonnement.");

    const body = (await request.json().catch(() => ({}))) as { clubId?: string; categoryId?: string };
    const seasonPass = await service.purchase(String(body.clubId ?? ""), String(body.categoryId ?? ""), session.id);
    return NextResponse.json({ seasonPass }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
