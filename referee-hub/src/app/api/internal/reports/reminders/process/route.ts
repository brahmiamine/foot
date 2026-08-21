import { NextRequest, NextResponse } from "next/server";
import { ensureRefereeServiceAuth } from "@/lib/serviceAuth";
import { RefereeReportSlaService } from "@/services/RefereeReportSlaService";

/** REF-004 — poll-once idempotent pour cron externe (rappels/escalade des rapports obligatoires). */
export async function POST(request: NextRequest) {
  const authError = ensureRefereeServiceAuth(request);
  if (authError) return authError;

  const result = await new RefereeReportSlaService().processReminders();
  return NextResponse.json(result);
}
