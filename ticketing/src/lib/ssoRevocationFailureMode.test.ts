import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createServer, type Server } from "node:http";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import {
  exportJWK,
  importPKCS8,
  importSPKI,
  SignJWT,
  type KeyLike,
} from "jose";
import {
  getSsoRevocationFailureMode,
  verifySsoTokenWithRevocation,
} from "../../../packages/auth-shared/src/session";

let signingKey: KeyLike;
let server: Server;
let ssoUrl: string;
let introspectionStatus = 200;
let introspectionActive = true;
const originalMode = process.env.SSO_REVOCATION_FAILURE_MODE;
const originalSsoUrl = process.env.SSO_URL;

beforeAll(async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  signingKey = await importPKCS8(privateKey, "RS256");
  const verificationKey = await importSPKI(publicKey, "RS256");
  const jwk = await exportJWK(verificationKey);
  const jwks = {
    keys: [{ ...jwk, kid: "revocation-test-kid", alg: "RS256", use: "sig" }],
  };

  server = createServer((request, response) => {
    if (request.url === "/api/.well-known/jwks.json") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(jwks));
      return;
    }
    if (request.url === "/api/session/introspect") {
      response.writeHead(introspectionStatus, { "content-type": "application/json" });
      response.end(JSON.stringify({ active: introspectionActive }));
      return;
    }
    response.writeHead(404);
    response.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test SSO server failed to start");
  ssoUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  if (originalMode === undefined) delete process.env.SSO_REVOCATION_FAILURE_MODE;
  else process.env.SSO_REVOCATION_FAILURE_MODE = originalMode;
  if (originalSsoUrl === undefined) delete process.env.SSO_URL;
  else process.env.SSO_URL = originalSsoUrl;
});

beforeEach(() => {
  process.env.SSO_URL = ssoUrl;
  introspectionStatus = 200;
  introspectionActive = true;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalMode === undefined) delete process.env.SSO_REVOCATION_FAILURE_MODE;
  else process.env.SSO_REVOCATION_FAILURE_MODE = originalMode;
});

async function signToken(): Promise<string> {
  return new SignJWT({
    email: "user@example.com",
    name: "User",
    role: "ADMIN",
    teamId: null,
    nonce: randomUUID(),
  })
    .setProtectedHeader({ alg: "RS256", kid: "revocation-test-kid" })
    .setSubject("user-1")
    .setIssuer("foot-sso")
    .setAudience("foot-platform")
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(signingKey);
}

describe("getSsoRevocationFailureMode", () => {
  it('defaults to "open" when unset', () => {
    delete process.env.SSO_REVOCATION_FAILURE_MODE;
    expect(getSsoRevocationFailureMode()).toBe("open");
  });

  it('defaults to "open" for any value other than "closed"', () => {
    process.env.SSO_REVOCATION_FAILURE_MODE = "strict";
    expect(getSsoRevocationFailureMode()).toBe("open");
  });

  it('returns "closed" when explicitly configured', () => {
    process.env.SSO_REVOCATION_FAILURE_MODE = "closed";
    expect(getSsoRevocationFailureMode()).toBe("closed");
  });
});

describe("verifySsoTokenWithRevocation", () => {
  it("requires SSO_URL for cryptographic JWKS verification regardless of fail mode", async () => {
    delete process.env.SSO_URL;
    process.env.SSO_REVOCATION_FAILURE_MODE = "open";
    expect(await verifySsoTokenWithRevocation(await signToken())).toBeNull();
  });

  it('rejects when introspection is unavailable and mode is "closed"', async () => {
    process.env.SSO_REVOCATION_FAILURE_MODE = "closed";
    introspectionStatus = 503;
    expect(await verifySsoTokenWithRevocation(await signToken())).toBeNull();
  });

  it('keeps the cryptographic result when introspection is unavailable and mode is "open"', async () => {
    process.env.SSO_REVOCATION_FAILURE_MODE = "open";
    introspectionStatus = 503;
    expect((await verifySsoTokenWithRevocation(await signToken()))?.id).toBe(
      "user-1",
    );
  });

  it("honors a confirmed revocation regardless of failure mode", async () => {
    process.env.SSO_REVOCATION_FAILURE_MODE = "open";
    introspectionActive = false;
    expect(await verifySsoTokenWithRevocation(await signToken())).toBeNull();
  });

  it("allows an explicit closed failMode to override an open app default", async () => {
    process.env.SSO_REVOCATION_FAILURE_MODE = "open";
    introspectionStatus = 503;
    expect(
      await verifySsoTokenWithRevocation(await signToken(), "closed"),
    ).toBeNull();
  });

  it("allows an explicit open failMode to override a closed app default", async () => {
    process.env.SSO_REVOCATION_FAILURE_MODE = "closed";
    introspectionStatus = 503;
    expect(
      (await verifySsoTokenWithRevocation(await signToken(), "open"))?.id,
    ).toBe("user-1");
  });

  it("logs a structured unconfirmed event for an unavailable introspection endpoint", async () => {
    process.env.SSO_REVOCATION_FAILURE_MODE = "open";
    introspectionStatus = 503;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await verifySsoTokenWithRevocation(await signToken());

    const logged = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(logged.event).toBe("sso_introspection");
    expect(logged.outcome).toBe("unconfirmed");
    expect(logged.reason).toBe("http_503");
  });

  it("logs the outcome of a successful introspection call", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await verifySsoTokenWithRevocation(await signToken());

    const logged = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(logged.outcome).toBe("active");
  });
});
