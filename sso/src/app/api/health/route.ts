import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vérifie, en plus de la base, la présence des variables critiques pour
 * qu'une session émise par cette app soit vérifiable ailleurs (voir
 * avancement.md, rang 2 : packages/auth-shared attend SSO_JWT_SECRET/
 * SSO_COOKIE_NAME identiques dans toutes les apps clientes).
 */
function checkConfig() {
  return {
    ssoJwtSecret: process.env.SSO_JWT_SECRET ? "set" : "missing",
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
      { status: configOk ? 200 : 503 }
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
      { status: 503 }
    );
  }
}
