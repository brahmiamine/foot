import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { PublicFormSettingsService } from "@/services/PublicFormSettingsService";
import { PUBLIC_FORM_DOMAINS, type PublicFormDomain } from "@/entities/PublicFormSettings";

/**
 * GET /api/internal/public-form-settings?teamId=&domain=
 * Lecture service-à-service (OB-001) : permet à une autre app (ex. club-ob
 * pour le formulaire vendeur) de consulter l'ouverture/fenêtre/rate limit
 * sans dupliquer la logique — la décision reste toujours calculée par
 * club-hub, l'appelant se contente d'appliquer la réponse.
 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const teamId = request.nextUrl.searchParams.get("teamId");
  const domain = request.nextUrl.searchParams.get("domain") as PublicFormDomain | null;
  if (!teamId || !domain || !PUBLIC_FORM_DOMAINS.includes(domain)) {
    return NextResponse.json({ error: "teamId and a valid domain are required" }, { status: 400 });
  }

  const settings = await new PublicFormSettingsService().get(teamId, domain);
  return NextResponse.json(settings);
}
