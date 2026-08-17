import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { TicketSaleGovernanceService } from "@/services/TicketSaleGovernanceService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json(await new TicketSaleGovernanceService().processDue());
}
