import { NextRequest, NextResponse } from "next/server";
import { fetchGoogleProfile } from "@/lib/google";
import { findOrCreateGoogleMember } from "@/lib/members";
import {
  MemberRegistrationError,
  registerGoogleMemberForClub,
} from "@/lib/memberRegistration";
import { issueSession } from "@/lib/session";
import { sessionContextFromRequest } from "@/lib/sessionRegistry";
import { sanitizeRedirect } from "@/lib/redirect";
import { OAUTH_STATE_COOKIE } from "@/lib/oauthState";

export const runtime = "nodejs";

function getRequestOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return host ? `${proto}://${host}` : request.nextUrl.origin;
}

function loginErrorRedirect(request: NextRequest, error: string) {
  const url = new URL("/membre/login", getRequestOrigin(request));
  url.searchParams.set("error", error);
  const response = NextResponse.redirect(url);
  response.cookies.set({ name: OAUTH_STATE_COOKIE, value: "", path: "/api/auth/google", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const googleError = request.nextUrl.searchParams.get("error");

  const stateCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  let expected: {
    state: string;
    redirect: string;
    teamId?: string | null;
    invitationToken?: string | null;
  } | null = null;
  try {
    expected = stateCookie ? JSON.parse(decodeURIComponent(stateCookie)) : null;
  } catch {
    expected = null;
  }

  if (googleError || !code || !state || !expected || expected.state !== state) {
    return loginErrorRedirect(request, "google");
  }

  try {
    const redirectUri = `${getRequestOrigin(request)}/api/auth/google/callback`;
    const profile = await fetchGoogleProfile(code, redirectUri);
    if (!profile.emailVerified) {
      return loginErrorRedirect(request, "google_unverified");
    }

    const target = sanitizeRedirect(expected.redirect) ?? "/";
    const sessionContext = sessionContextFromRequest(request);
    if (expected.teamId) {
      try {
        const result = await registerGoogleMemberForClub({
          teamId: expected.teamId,
          email: profile.email,
          name: profile.name || profile.email,
          invitationToken: expected.invitationToken ?? null,
        });
        if (result.status !== "ACTIVE") {
          return loginErrorRedirect(
            request,
            result.status === "PENDING_EMAIL_VERIFICATION"
              ? "email_verification_pending"
              : "club_approval_pending",
          );
        }
        const response = NextResponse.redirect(new URL(target, getRequestOrigin(request)));
        response.cookies.set({ name: OAUTH_STATE_COOKIE, value: "", path: "/api/auth/google", maxAge: 0 });
        await issueSession(response, result.user, sessionContext);
        return response;
      } catch (error) {
        if (error instanceof MemberRegistrationError) {
          const codeMap: Record<string, string> = {
            REGISTRATION_CLOSED: "registration_closed",
            INVITATION_REQUIRED: "invitation_required",
            EMAIL_TAKEN: "staff_email",
          };
          return loginErrorRedirect(request, codeMap[error.code] ?? "registration");
        }
        throw error;
      }
    }

    const result = await findOrCreateGoogleMember(profile);
    if (!result.ok) {
      return loginErrorRedirect(request, "staff_email");
    }

    const response = NextResponse.redirect(new URL(target, getRequestOrigin(request)));
    response.cookies.set({ name: OAUTH_STATE_COOKIE, value: "", path: "/api/auth/google", maxAge: 0 });
    await issueSession(response, result.user, sessionContext);
    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return loginErrorRedirect(request, "google");
  }
}
