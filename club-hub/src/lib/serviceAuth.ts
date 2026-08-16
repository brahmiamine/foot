import { NextRequest, NextResponse } from "next/server";

/** Service-to-service guard for `/api/internal/*`. */
export function ensureServiceAuth(request: NextRequest): NextResponse | null {
  const current = process.env.CLUB_HUB_SERVICE_API_KEY;
  if (!current) {
    return NextResponse.json({ error: "Service API not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-api-key");
  if (!provided) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let kid: "current" | "previous" | null = null;
  if (provided === current) {
    kid = "current";
  } else {
    const previous = process.env.CLUB_HUB_SERVICE_API_KEY_PREVIOUS;
    const previousExpiresAt = process.env.CLUB_HUB_SERVICE_API_KEY_PREVIOUS_EXPIRES_AT;
    const expiresAtMs = previousExpiresAt ? Date.parse(previousExpiresAt) : Number.NaN;
    const stillInGracePeriod = Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();
    if (previous && provided === previous && stillInGracePeriod) {
      kid = "previous";
    }
  }

  if (!kid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.warn(
    JSON.stringify({
      event: "service_auth",
      kid,
      endpoint: `${request.method} ${request.nextUrl.pathname}`,
      timestamp: new Date().toISOString(),
    }),
  );

  return null;
}
