import { NextResponse } from "next/server";
import { getSsoSession, type SsoUser } from "@/lib/ssoSession";

export type RequireStaffResult = { ok: true; session: SsoUser } | { ok: false; response: NextResponse };

/**
 * `ob` n'a pas d'espace admin dédié : la création de sondages/votes à
 * thème reste réservée au staff (ADMIN/SUPERADMIN, même session SSO que
 * matchsheet/superadmin) plutôt que d'ouvrir ça à tous les membres.
 */
export async function requireStaff(): Promise<RequireStaffResult> {
  const session = await getSsoSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return { ok: false, response: NextResponse.json({ error: "Accès réservé au staff" }, { status: 403 }) };
  }
  return { ok: true, session };
}
