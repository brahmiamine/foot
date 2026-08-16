import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "crypto";
import { exportJWK, importPKCS8, importSPKI, SignJWT, type KeyLike } from "jose";
import { SSO_JWT_AUDIENCE, verifySsoToken } from "../../../packages/auth-shared/src/session";

let signingKey: KeyLike;
let jwks: { keys: Record<string, unknown>[] };
const originalFetch = globalThis.fetch;

beforeAll(async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  signingKey = await importPKCS8(privateKey, "RS256");
  const verificationKey = await importSPKI(publicKey, "RS256");
  const jwk = await exportJWK(verificationKey);
  jwks = { keys: [{ ...jwk, kid: "test-kid", alg: "RS256", use: "sig" }] };
});

beforeEach(() => {
  process.env.SSO_URL = "https://sso.test";
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify(jwks), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  ) as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

async function signToken(audience?: string | string[]): Promise<string> {
  let jwt = new SignJWT({ email: "user@example.com", name: "User", role: "ADMIN", teamId: null })
    .setProtectedHeader({ alg: "RS256", kid: "test-kid" })
    .setSubject("user-1")
    .setIssuer("foot-sso")
    .setIssuedAt()
    .setExpirationTime("12h");
  if (audience !== undefined) jwt = jwt.setAudience(audience);
  return jwt.sign(signingKey);
}

describe("verifySsoToken — strict audience and algorithm", () => {
  it("accepts the expected audience", async () => {
    expect((await verifySsoToken(await signToken(SSO_JWT_AUDIENCE)))?.id).toBe("user-1");
  });

  it("rejects a token without aud", async () => {
    expect(await verifySsoToken(await signToken())).toBeNull();
  });

  it("rejects a different audience", async () => {
    expect(await verifySsoToken(await signToken("some-other-app"))).toBeNull();
  });

  it("accepts an audience array containing the platform audience", async () => {
    expect(
      (await verifySsoToken(await signToken(["some-other-app", SSO_JWT_AUDIENCE])))?.id,
    ).toBe("user-1");
  });

  it("rejects legacy HS256 session tokens", async () => {
    const token = await new SignJWT({ email: "user@example.com", role: "ADMIN" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuer("foot-sso")
      .setAudience(SSO_JWT_AUDIENCE)
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode("legacy-secret-at-least-32-bytes-long"));
    expect(await verifySsoToken(token)).toBeNull();
  });
});
