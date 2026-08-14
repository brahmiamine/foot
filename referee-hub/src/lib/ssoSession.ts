import { NextRequest, NextResponse } from "next/server";
import {
  buildSsoRedirectUrl,
  clearSsoCookie,
  getSsoTokenFromRequest,
  verifySsoTokenWithRevocation,
} from "../../../packages/auth-shared/src/session";

export const REFEREE_HUB_ROLES = new Set(["REFEREE", "MATCH_OFFICIAL", "REFEREE_OBSERVER"]);

export interface RefereeHubSession {
  id: string;
  email: string;
  name: string;
  role: "REFEREE" | "MATCH_OFFICIAL" | "REFEREE_OBSERVER";
  teamId: null;
}

export async function getSession(request: NextRequest): Promise<RefereeHubSession | null> {
  const token = getSsoTokenFromRequest(request);
  if (!token) return null;
  const session = await verifySsoTokenWithRevocation(token, "closed");
  if (!session || !REFEREE_HUB_ROLES.has(session.role) || session.teamId) return null;
  return session as RefereeHubSession;
}

export function redirectToIdentity(request: NextRequest): NextResponse {
  return NextResponse.redirect(buildSsoRedirectUrl(request.url, "/login"));
}

export { clearSsoCookie, getSsoTokenFromRequest };
