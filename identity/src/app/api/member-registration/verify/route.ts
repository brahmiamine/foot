import { NextRequest, NextResponse } from "next/server";
import {
  MemberRegistrationError,
  verifyMemberRegistration,
} from "@/lib/memberRegistration";
import { issueSession } from "@/lib/session";
import { sessionContextFromRequest } from "@/lib/sessionRegistry";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "token requis" }, { status: 400 });
  }
  try {
    const user = await verifyMemberRegistration(token);
    const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));
    await issueSession(response, user, sessionContextFromRequest(request));
    return response;
  } catch (error) {
    if (error instanceof MemberRegistrationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("Member registration verification error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
