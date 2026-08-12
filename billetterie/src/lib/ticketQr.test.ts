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
});
