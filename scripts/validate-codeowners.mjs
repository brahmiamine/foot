import { existsSync, readFileSync } from 'node:fs';

const codeownersPath = '.github/CODEOWNERS';

if (!existsSync(codeownersPath)) {
  console.error(`Missing ${codeownersPath}`);
  process.exit(1);
}

const requiredOwners = new Map([
  ['/.github/', '@brahmiamine'],
  ['/db/', '@brahmiamine'],
  ['/identity/', '@brahmiamine'],
  ['/payments/', '@brahmiamine'],
  ['/medical-hub/', '@brahmiamine'],
  ['/packages/domain-contracts/', '@brahmiamine'],
]);

const entries = readFileSync(codeownersPath, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => line.split(/\s+/))
  .filter((parts) => parts.length >= 2)
  .map(([pattern, ...owners]) => ({ pattern, owners }));

const missing = [];
for (const [pattern, owner] of requiredOwners) {
  const entry = entries.find((candidate) => candidate.pattern === pattern);
  if (!entry || !entry.owners.includes(owner)) {
    missing.push(`${pattern} -> ${owner}`);
  }
}

if (missing.length > 0) {
  console.error('CODEOWNERS is missing required critical-domain ownership:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`CODEOWNERS covers ${requiredOwners.size} critical repository domains.`);
