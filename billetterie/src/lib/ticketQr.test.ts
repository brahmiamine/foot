import { afterEach, beforeEach, describe, expect, it } from "vitest";

const envBackup = { ...process.env };

beforeEach(() => {
  process.env.TICKET_QR_SECRET = "top-secret-for-tests";
});

afterEach(() => {
  process.env = { ...envBackup };
});

describe("ticketQr (sign/verify)", () => {
  it("signe puis vérifie un jeton, retrouve le ticketId d'origine", async () => {
    const { signTicketToken, verifyTicketToken } = await import("./ticketQr");
    const token = await signTicketToken("ticket-123");

    const ticketId = await verifyTicketToken(token);

    expect(ticketId).toBe("ticket-123");
  });

  it("rejette un jeton dont la signature a été altérée", async () => {
    const { signTicketToken, verifyTicketToken } = await import("./ticketQr");
    const token = await signTicketToken("ticket-123");
    const tampered = token.slice(0, -2) + (token.slice(-2) === "aa" ? "bb" : "aa");

    expect(await verifyTicketToken(tampered)).toBeNull();
  });

  it("rejette un jeton signé avec un autre secret", async () => {
    const { signTicketToken } = await import("./ticketQr");
    const token = await signTicketToken("ticket-123");

    process.env.TICKET_QR_SECRET = "a-completely-different-secret";
    const { verifyTicketToken } = await import("./ticketQr");
    expect(await verifyTicketToken(token)).toBeNull();
  });

  it("rejette une chaîne qui n'est pas un JWT", async () => {
    const { verifyTicketToken } = await import("./ticketQr");
    expect(await verifyTicketToken("not-a-jwt")).toBeNull();
  });

  describe("rotation par kid (TASK-P0-009)", () => {
    it("signe avec le kid courant (TICKET_QR_KID) et vérifie via TICKET_QR_SECRET_<kid>", async () => {
      delete process.env.TICKET_QR_SECRET;
      process.env.TICKET_QR_KID = "v2";
      process.env.TICKET_QR_SECRET_v2 = "secret-v2";
      const { signTicketToken, verifyTicketToken } = await import("./ticketQr");

      const token = await signTicketToken("ticket-abc");
      expect(await verifyTicketToken(token)).toBe("ticket-abc");
    });

    it("un jeton signé avec l'ancien kid reste vérifiable après rotation vers un nouveau kid (grâce period)", async () => {
      process.env.TICKET_QR_KID = "v1";
      process.env.TICKET_QR_SECRET_v1 = "secret-v1";
      const { signTicketToken } = await import("./ticketQr");
      const oldToken = await signTicketToken("ticket-old");

      // Rotation : le kid courant change, mais l'ancienne clé reste chargée
      // (TICKET_QR_SECRET_v1 toujours présent) le temps que les jetons émis
      // avec v1 expirent (jusqu'à 1 an).
      process.env.TICKET_QR_KID = "v2";
      process.env.TICKET_QR_SECRET_v2 = "secret-v2";
      const { verifyTicketToken } = await import("./ticketQr");

      expect(await verifyTicketToken(oldToken)).toBe("ticket-old");
    });

    it("rejette un jeton dont le kid n'a plus de clé chargée (clé retirée après la période de grâce)", async () => {
      process.env.TICKET_QR_KID = "v1";
      process.env.TICKET_QR_SECRET_v1 = "secret-v1";
      const { signTicketToken } = await import("./ticketQr");
      const oldToken = await signTicketToken("ticket-old");

      delete process.env.TICKET_QR_SECRET_v1;
      process.env.TICKET_QR_KID = "v2";
      process.env.TICKET_QR_SECRET_v2 = "secret-v2";
      const { verifyTicketToken } = await import("./ticketQr");

      expect(await verifyTicketToken(oldToken)).toBeNull();
    });

    it("reste rétrocompatible : un jeton signé sans kid (TICKET_QR_SECRET seul) reste vérifiable", async () => {
      const { signTicketToken, verifyTicketToken } = await import("./ticketQr");
      const token = await signTicketToken("ticket-legacy");

      expect(await verifyTicketToken(token)).toBe("ticket-legacy");
    });
  });
});
