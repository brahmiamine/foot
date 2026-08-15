#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export const applications = [
  "arbinote",
  "ticketing",
  "match-operations",
  "referee-hub",
  "club-ob",
  "seller-portal",
  "identity",
  "federation-hub",
  "club-hub",
  "player-hub",
  "staff-hub",
  "medical-hub",
];
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function params(value) {
  return [...String(value).matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map((m) => m[1]).sort();
}

function parseTs(file) {
  const source = fs.readFileSync(file, "utf8");
  const fr = source.match(/\bfr\s*:\s*\{([\s\S]*?)\}\s*,\s*ar\s*:/)?.[1]
    ?? source.match(/\bconst\s+fr\s*=\s*\{([\s\S]*?)\}\s*(?:as const|satisfies[^;]+)?;/)?.[1];
  const ar = source.match(/\bar\s*:\s*\{([\s\S]*?)\}\s*\}\s*(?:as const)?/)?.[1]
    ?? source.match(/\bconst\s+ar\s*=\s*\{([\s\S]*?)\}\s*(?:as const|satisfies[^;]+)?;/)?.[1];
  if (!fr || !ar) throw new Error(`catalogue non analysable: ${path.relative(root, file)}`);
  const read = (block) => Object.fromEntries(
    [...block.matchAll(/(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$]*))\s*:\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')/g)]
      .map((m) => {
        const value = m[4] ?? m[5];
        return [m[1] || m[2] || m[3], value.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, "\n")];
      }),
  );
  return { fr: read(fr), ar: read(ar) };
}

function catalog(app) {
  const base = path.join(root, app, "src");
  const jsonFr = path.join(base, "locales/fr.json");
  if (fs.existsSync(jsonFr)) return { fr: JSON.parse(fs.readFileSync(jsonFr)), ar: JSON.parse(fs.readFileSync(path.join(base, "locales/ar.json"))) };
  const candidates = ["i18n/dictionaries.ts", "lib/i18n/dictionaries.ts"];
  const found = candidates.map((f) => path.join(base, f)).find(fs.existsSync);
  if (!found) throw new Error(`${app}: aucun catalogue fr/ar`);
  return parseTs(found);
}

function flatten(value, prefix = "", output = {}) {
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) flatten(child, full, output); else output[full] = child;
  }
  return output;
}

/** Inventories user-visible string candidates without pretending to parse TypeScript. */
function literalInventory(app) {
  const sourceRoot = path.join(root, app, "src");
  const roots = ["app", "components"].map((directory) => path.join(sourceRoot, directory)).filter(fs.existsSync);
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (/\.(?:tsx?|jsx?)$/.test(entry.name)) files.push(absolute);
    }
  };
  roots.forEach(visit);

  const candidates = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      const visibleText = [...line.matchAll(/>([^<{]*[A-Za-zÀ-ÿ\u0600-\u06ff][^<{]*)</g)];
      const attributes = [...line.matchAll(/\b(?:aria-label|title|placeholder|alt)=["']([^"']*[A-Za-zÀ-ÿ\u0600-\u06ff][^"']*)["']/g)];
      for (const match of [...visibleText, ...attributes]) {
        const value = match[1].replace(/&(?:apos|quot|amp|lt|gt);/g, " ").trim();
        if (value) candidates.push({ file: path.relative(path.join(root, app), file), line: index + 1, value });
      }
    });
  }
  return candidates;
}

export function audit(app) {
  const dictionaries = catalog(app);
  const fr = flatten(dictionaries.fr), ar = flatten(dictionaries.ar);
  const errors = [];
  for (const key of new Set([...Object.keys(fr), ...Object.keys(ar)])) {
    if (!(key in fr)) errors.push(`${key}: absent du catalogue français`);
    if (!(key in ar)) errors.push(`${key}: absent du catalogue arabe`);
    if (key in ar && (typeof ar[key] !== "string" || !ar[key].trim())) errors.push(`${key}: traduction arabe vide`);
    if (key in fr && (typeof fr[key] !== "string" || !fr[key].trim())) errors.push(`${key}: traduction française vide`);
    if (key in fr && key in ar && params(fr[key]).join() !== params(ar[key]).join()) errors.push(`${key}: paramètres différents (${params(fr[key])} / ${params(ar[key])})`);
  }
  return { app, keys: Object.keys(fr).length, errors };
}

const selected = process.argv.includes("--project") ? [process.argv[process.argv.indexOf("--project") + 1]] : applications;
let failed = false;
for (const app of selected) {
  try {
    const result = audit(app);
    if (result.errors.length) { failed = true; console.error(`✗ ${app}\n  ${result.errors.join("\n  ")}`); }
    else {
      const literals = literalInventory(app);
      console.log(`✓ ${app}: ${result.keys} clés fr/ar valides; ${literals.length} littéraux UI à inventorier dans src/app et src/components`);
      if (process.argv.includes("--literals")) {
        for (const item of literals) console.log(`  ${item.file}:${item.line}\t${item.value}`);
      }
    }
  } catch (error) { failed = true; console.error(`✗ ${error.message}`); }
}
if (failed) process.exitCode = 1;
