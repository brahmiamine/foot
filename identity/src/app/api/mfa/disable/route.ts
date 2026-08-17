import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentSession, issueSession } from "@/lib/session";
import { getDataSource } from "@/lib/db";
import { User } from "@/entities/User";
import { getMfaRolePolicy } from "@/lib/mfaPolicy";
import { isTrustedOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/** Exige le mot de passe et refuse toute désactivation interdite par policy. */
export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const policy = await getMfaRolePolicy(session.role);
  if (policy.mode === "REQUIRED") {
    return NextResponse.json({ error: "MFA_REQUIRED_BY_POLICY" }, { status: 409 });
  }

  const body = await request.json();
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "CURRENT_PASSWORD_REQUIRED" }, { status: 400 });
  }

  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 404 });
  }

  if (!(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "INVALID_CURRENT_PASSWORD" }, { status: 401 });
  }

  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.mfaRecoveryCodes = null;
  user.tokenVersion += 1;
  await userRepo.save(user);

  const response = NextResponse.json({ success: true });
  await issueSession(response, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId ?? null,
    federationId: user.federationId ?? null,
    leagueId: user.leagueId ?? null,
    playerId: user.playerId ?? null,
    tokenVersion: user.tokenVersion,
  });
  return response;
}
