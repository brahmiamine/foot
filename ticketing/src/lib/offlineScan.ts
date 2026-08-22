"use client";


/**
 * Mode hors-ligne du scanner de contrôle d'accès (avancement.md, rang 2).
 * Toute la logique de ce fichier tourne dans le navigateur : pas d'accès
 * à la base ni au secret de signature des jetons (TICKET_QR_SECRET reste
 * serveur-only). Le compromis assumé est décrit dans
 * getOfflineScanManifest (src/lib/tickets.ts) : un jeton scanné hors-ligne
 * n'est reconnu que par son `ticketId` (lu sans vérification de signature
 * depuis la charge utile du JWT) confronté au manifeste téléchargé en
 * ligne — la vérification cryptographique réelle n'a lieu qu'à la
 * synchronisation.
 */

export interface OfflineManifestTicket {
  ticketId: string;
  reference: string;
  status: "PAID" | "USED";
  categoryName: string;
}

export interface OfflineScanManifest {
  matchId: string;
  matchLabel: string;
  matchCancelled: boolean;
  generatedAt: string;
  /** TICK-005 — null si le club n'a pas configuré de durée de validité. */
  expiresAt: string | null;
  tickets: OfflineManifestTicket[];
}

export interface PendingScan {
  id: string;
  token: string;
  ticketId: string | null;
  scannedAt: string;
}

export type OfflineOutcome = "SUCCESS" | "ALREADY_USED" | "NOT_PAID" | "MATCH_CANCELLED" | "INVALID";

export interface OfflineEvaluation {
  outcome: OfflineOutcome;
  reference?: string;
  categoryName?: string;
}

const MANIFEST_KEY = "ticketing:offline-scan:manifest";
const QUEUE_KEY = "ticketing:offline-scan:queue";
const LOCAL_USED_KEY = "ticketing:offline-scan:locally-used";
const TERMINAL_ID_KEY = "ticketing:offline-scan:terminal-id";
const DEVICE_CREDENTIALS_KEY = "ticketing:offline-scan:device-credentials";

export interface ScanDeviceCredentials {
  deviceId: string;
  secret: string;
}

/**
 * TICK-004 — identifiants de l'appareil enregistré (voir
 * /api/admin/tickets/scan-devices), saisis une fois par le staff après
 * l'enregistrement et envoyés en en-têtes sur les routes hors-ligne
 * (manifeste + synchro). Distinct de `terminalId` (getOrCreateTerminalId) :
 * `terminalId` est un identifiant auto-généré, jamais vérifié serveur ;
 * les identifiants d'appareil, eux, sont émis par le serveur et vérifiables.
 */
export function getDeviceCredentials(): ScanDeviceCredentials | null {
  return readJson<ScanDeviceCredentials | null>(DEVICE_CREDENTIALS_KEY, null);
}

export function setDeviceCredentials(credentials: ScanDeviceCredentials): void {
  writeJson(DEVICE_CREDENTIALS_KEY, credentials);
}

export function clearDeviceCredentials(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEVICE_CREDENTIALS_KEY);
}

/**
 * Identifiant d'appareil (TASK-P0-008) : généré une fois par navigateur et
 * persisté en localStorage, jamais rattaché à un compte SSO — sert
 * uniquement à distinguer deux terminaux qui synchronisent des scans
 * hors-ligne du même billet (voir src/lib/tickets.ts, syncScans), pour
 * afficher "billet déjà scanné par le terminal X à telle heure".
 */
export function getOrCreateTerminalId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(TERMINAL_ID_KEY);
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `term-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(TERMINAL_ID_KEY, generated);
  return generated;
}

/**
 * Lit `ticketId` depuis la charge utile d'un JWT sans vérifier la
 * signature (impossible côté navigateur, le secret HS256 reste
 * serveur-only). Ne jamais utiliser ce résultat comme preuve
 * d'authenticité — seulement comme index dans le manifeste local.
 */
export function decodeUnverifiedTicketId(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadB64 + "=".repeat((4 - (payloadB64.length % 4)) % 4);
    const json = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("utf-8");
    const payload = JSON.parse(json) as { ticketId?: unknown };
    return typeof payload.ticketId === "string" ? payload.ticketId : null;
  } catch {
    return null;
  }
}

/**
 * Évalue un scan hors-ligne contre le manifeste téléchargé + les tickets
 * déjà marqués "utilisés" localement depuis (par cet appareil) — ne
 * remplace jamais la relecture serveur faite à la synchronisation.
 */
export function evaluateOfflineScan(
  token: string,
  manifest: OfflineScanManifest,
  locallyUsedTicketIds: ReadonlySet<string>,
): OfflineEvaluation {
  const ticketId = decodeUnverifiedTicketId(token);
  if (!ticketId) return { outcome: "INVALID" };

  const entry = manifest.tickets.find((t) => t.ticketId === ticketId);
  if (!entry) return { outcome: "INVALID" };

  if (manifest.matchCancelled) {
    return { outcome: "MATCH_CANCELLED", reference: entry.reference, categoryName: entry.categoryName };
  }

  if (entry.status === "USED" || locallyUsedTicketIds.has(ticketId)) {
    return { outcome: "ALREADY_USED", reference: entry.reference, categoryName: entry.categoryName };
  }

  return { outcome: "SUCCESS", reference: entry.reference, categoryName: entry.categoryName };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function saveManifest(manifest: OfflineScanManifest): void {
  writeJson(MANIFEST_KEY, manifest);
  writeJson(LOCAL_USED_KEY, []);
}

export function loadManifest(): OfflineScanManifest | null {
  return readJson<OfflineScanManifest | null>(MANIFEST_KEY, null);
}

export function clearManifest(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MANIFEST_KEY);
  window.localStorage.removeItem(LOCAL_USED_KEY);
}

export function getLocallyUsedTicketIds(): Set<string> {
  return new Set(readJson<string[]>(LOCAL_USED_KEY, []));
}

export function markLocallyUsed(ticketId: string): void {
  const current = getLocallyUsedTicketIds();
  current.add(ticketId);
  writeJson(LOCAL_USED_KEY, Array.from(current));
}

export function getPendingScans(): PendingScan[] {
  return readJson<PendingScan[]>(QUEUE_KEY, []);
}

export function enqueuePendingScan(token: string): PendingScan {
  const entry: PendingScan = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    token,
    ticketId: decodeUnverifiedTicketId(token),
    scannedAt: new Date().toISOString(),
  };
  const queue = getPendingScans();
  queue.push(entry);
  writeJson(QUEUE_KEY, queue);
  return entry;
}

export function removePendingScan(id: string): void {
  writeJson(
    QUEUE_KEY,
    getPendingScans().filter((s) => s.id !== id),
  );
}
