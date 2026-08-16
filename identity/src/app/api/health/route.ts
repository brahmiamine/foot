import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vérifie les prérequis nécessaires à l'émission RS256/JWKS et au cookie SSO.
 * Les clés précédentes sont optionnelles : elles ne sont requises que pendant
 * une rotation planifiée.
 */
function checkConfig() {
  return {
    ssoJwtPrivateKey: process.env.SSO_JWT_PRIVATE_KEY ? "set" : "missing",
    ssoJwtKid: process.env.SSO_JWT_KID ? "set" : "missing",
    ssoCookieName: process.env.SSO_COOKIE_NAME ? "set" : "missing",
    ssoUrl: process.env.SSO_URL ? "set" : "missing",
  };
}

export async function GET() {
  const startedAt = Date.now();
  const config = checkConfig();
  const configOk = Object.values(config).every((value) => value === "set");

  try {
    const dataSource = await getDataSource();
    await dataSource.query("SELECT 1");

    return NextResponse.json(
      {
        status: configOk ? "ok" : "degraded",
        database: "ok",
        config,
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: configOk ? 200 : 503 },
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        database: "error",
        config,
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
