import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE } from "@/lib/i18n";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { locale?: unknown } | null;
  const locale = body?.locale === "ar" ? "ar" : "fr";
  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 31_536_000 });
  return response;
}
