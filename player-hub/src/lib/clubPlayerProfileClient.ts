import type { PlayerProfileChangeInput } from "@/services/player/profileChangePolicy";

export interface PlayerProfileRequestDto {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "STALE" | "AUTO_APPLIED";
  requestedChanges: Record<string, unknown>;
  beforeSnapshot: Record<string, unknown>;
  reviewReason: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

function config() {
  const baseUrl = process.env.CLUB_HUB_SERVICE_URL?.replace(/\/$/, "");
  const apiKey = process.env.CLUB_HUB_SERVICE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("CLUB_HUB_SERVICE_URL/CLUB_HUB_SERVICE_API_KEY non configuré");
  }
  return { baseUrl, apiKey };
}

async function readError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : `Club Hub a répondu ${response.status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = config();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "erreur réseau";
    throw new Error(`Club Hub indisponible : ${reason}`);
  }
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<T>;
}

export async function updateDirectPlayerProfile(input: {
  playerId: string;
  requesterUserId: string;
  imageUrl: string | null;
}) {
  return request<{ result: PlayerProfileRequestDto | null }>("/api/internal/player-profile", {
    method: "POST",
    body: JSON.stringify({ action: "UPDATE_DIRECT", ...input }),
  });
}

export async function submitSensitivePlayerProfileChanges(input: {
  playerId: string;
  requesterUserId: string;
  changes: PlayerProfileChangeInput;
}) {
  return request<{ result: PlayerProfileRequestDto }>("/api/internal/player-profile", {
    method: "POST",
    body: JSON.stringify({ action: "SUBMIT_SENSITIVE", ...input }),
  });
}

export async function listPlayerProfileRequests(playerId: string, requesterUserId: string) {
  const params = new URLSearchParams({ playerId, requesterUserId });
  return request<{ requests: PlayerProfileRequestDto[] }>(`/api/internal/player-profile?${params.toString()}`);
}
