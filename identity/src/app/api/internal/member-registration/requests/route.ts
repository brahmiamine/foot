import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { listPendingMemberRegistrations } from "@/lib/memberRegistration";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;
  const teamId = request.nextUrl.searchParams.get("teamId")?.trim();
  if (!teamId) return NextResponse.json({ error: "teamId requis" }, { status: 400 });
  const requests = await listPendingMemberRegistrations(teamId);
  return NextResponse.json(
    requests.map((item) => ({
      id: item.id,
      teamId: item.teamId,
      email: item.email,
      name: item.name,
      firstName: item.firstName,
      lastName: item.lastName,
      phoneNumber: item.phoneNumber,
      provider: item.provider,
      modeSnapshot: item.modeSnapshot,
      status: item.status,
      userId: item.userId,
      createdAt: item.createdAt.toISOString(),
    })),
  );
}
