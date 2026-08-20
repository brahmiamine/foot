import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { TrainingInvitationService } from "@/services/TrainingInvitationService";

export const runtime = "nodejs";

/** À invoquer par l'ordonnanceur : enfile les rappels RSVP devenus exigibles. */
export async function POST(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;
  const result = await new TrainingInvitationService().processPendingReminders();
  return NextResponse.json(result);
}
