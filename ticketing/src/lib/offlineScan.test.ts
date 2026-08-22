import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { decodeUnverifiedTicketId, evaluateOfflineScan, getOrCreateTerminalId, type OfflineScanManifest } from "./offlineScan";

async function makeToken(ticketId: string, secret = "any-secret-offline-cannot-check-this") {
  return new SignJWT({ ticketId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1y")
    .sign(new TextEncoder().encode(secret));
}

function manifest(overrides: Partial<OfflineScanManifest> = {}): OfflineScanManifest {
  return {
    matchId: "match-1",
    matchLabel: "Domicile FC - Visiteur FC",
    matchCancelled: false,
    generatedAt: new Date().toISOString(),
    expiresAt: null,
    tickets: [
      { ticketId: "ticket-paid", reference: "REF-PAID", status: "PAID", categoryName: "Tribune" },
      { ticketId: "ticket-used", reference: "REF-USED", status: "USED", categoryName: "Tribune" },
    ],
    ...overrides,
  };
}

describe("decodeUnverifiedTicketId", () => {
  it("lit ticketId depuis la charge utile sans vérifier la signature", async () => {
    const token = await makeToken("ticket-abc");
    expect(decodeUnverifiedTicketId(token)).toBe("ticket-abc");
  });

  it("retourne null pour une chaîne qui n'est pas un JWT", () => {
    expect(decodeUnverifiedTicketId("not-a-jwt")).toBeNull();
  });

  it("retourne null pour un JWT dont la charge utile n'est pas du JSON", () => {
    expect(decodeUnverifiedTicketId("aaa.bbb.ccc")).toBeNull();
  });
});

describe("evaluateOfflineScan", () => {
  it("SUCCESS pour un billet PAID connu du manifeste, jamais scanné localement", async () => {
    const token = await makeToken("ticket-paid");
    const result = evaluateOfflineScan(token, manifest(), new Set());
    expect(result).toEqual({ outcome: "SUCCESS", reference: "REF-PAID", categoryName: "Tribune" });
  });

  it("ALREADY_USED pour un billet déjà USED dans le manifeste", async () => {
    const token = await makeToken("ticket-used");
    const result = evaluateOfflineScan(token, manifest(), new Set());
    expect(result.outcome).toBe("ALREADY_USED");
  });

  it("ALREADY_USED pour un billet marqué utilisé localement depuis le téléchargement du manifeste", async () => {
    const token = await makeToken("ticket-paid");
    const result = evaluateOfflineScan(token, manifest(), new Set(["ticket-paid"]));
    expect(result.outcome).toBe("ALREADY_USED");
  });

  it("MATCH_CANCELLED si le match du manifeste est annulé", async () => {
    const token = await makeToken("ticket-paid");
    const result = evaluateOfflineScan(token, manifest({ matchCancelled: true }), new Set());
    expect(result.outcome).toBe("MATCH_CANCELLED");
  });

  it("INVALID pour un ticketId absent du manifeste (autre match, ou forgé)", async () => {
    const token = await makeToken("ticket-inconnu");
    const result = evaluateOfflineScan(token, manifest(), new Set());
    expect(result.outcome).toBe("INVALID");
  });

  it("INVALID pour un jeton qui n'est pas un JWT exploitable", () => {
    const result = evaluateOfflineScan("garbage", manifest(), new Set());
    expect(result.outcome).toBe("INVALID");
  });
});

/** TASK-P0-008 : identifiant de terminal, base de la détection de conflit multi-scanner. */
describe("getOrCreateTerminalId", () => {
  it("retourne une valeur stable même hors navigateur (environnement de test sans window)", () => {
    expect(getOrCreateTerminalId()).toBe(getOrCreateTerminalId());
  });
});
