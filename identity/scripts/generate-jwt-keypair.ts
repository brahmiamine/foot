import { generateKeyPairSync } from "crypto";

/**
 * TASK-P0-001 : génère une paire de clés RSA 2048 pour signer les JWT de
 * session (RS256) et affiche les variables d'env prêtes à copier.
 *
 * Usage :
 *   pnpm jwt:generate-keypair                 # nouvelle clé "current"
 *   pnpm jwt:generate-keypair -- --previous    # à coller dans _PREVIOUS
 *                                               # lors d'une rotation
 *
 * Voir docs/jwt-rotation-runbook.md pour la procédure complète.
 */

function main() {
  const isPrevious = process.argv.includes("--previous");
  const suffix = isPrevious ? "_PREVIOUS" : "";

  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });

  const kid = `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;
  const singleLinePem = privateKey.trim().replace(/\n/g, "\\n");

  console.log(`# Copier ces deux lignes dans le .env de sso${isPrevious ? " (rotation en cours)" : ""}:`);
  console.log(`SSO_JWT_KID${suffix}=${kid}`);
  console.log(`SSO_JWT_PRIVATE_KEY${suffix}="${singleLinePem}"`);
}

main();
