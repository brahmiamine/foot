import { NextRequest, NextResponse } from "next/server";
import { ScanDeviceService } from "@/services/ScanDeviceService";
import type { ScanDevice } from "@/entities/ScanDevice";

const service = new ScanDeviceService();

/**
 * TICK-004 — garde d'accès aux routes de synchro hors-ligne (téléchargement
 * du manifeste, upload des scans en attente). Volontairement restreint à
 * ces deux routes : le scan en ligne (`/api/admin/tickets/scan`) reste
 * accessible à toute session ADMIN/SUPERADMIN sans appareil enregistré,
 * comme avant ce lot — seul le flux spécifiquement hors-ligne (terminal non
 * supervisé en direct) exige une identité d'appareil vérifiable.
 */
export async function ensureScanDeviceAuth(request: NextRequest): Promise<{ device: ScanDevice } | { unauthorized: NextResponse }> {
  const deviceId = request.headers.get("x-scan-device-id");
  const secret = request.headers.get("x-scan-device-secret");
  if (!deviceId || !secret) {
    return { unauthorized: NextResponse.json({ error: "Appareil scanner non identifié" }, { status: 401 }) };
  }
  const device = await service.verify(deviceId, secret);
  if (!device) {
    return { unauthorized: NextResponse.json({ error: "Appareil scanner inconnu ou révoqué" }, { status: 401 }) };
  }
  return { device };
}
