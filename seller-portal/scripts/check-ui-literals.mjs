import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const roots = ["src/app/(auth)", "src/app/(dashboard)", "src/components/layout", "src/components/ui"];
const files = roots.flatMap((root) => fs.readdirSync(root, { recursive: true }).filter((name) => name.endsWith(".tsx")).map((name) => path.join(root, name)));
const visibleAttributes = new Set(["label", "hint", "placeholder", "title", "description", "aria-label"]);
const uiCalls = new Set(["setError", "setNotice", "setMessage", "confirm", "alert"]);
const allowedMarks = new Set(["SP", "M"]);
const findings = [];
const looksVisible = (value) => /[A-Za-zÀ-ÿ\u0600-\u06ff]{2}/u.test(value) && !allowedMarks.has(value.trim());

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (/^[\s\S]*?["']use client["'];/.test(source) && !source.includes("useI18n(")) findings.push(`${file}: composant client sans useI18n`);
  const visit = (node) => {
    if (ts.isJsxText(node) && looksVisible(node.text)) findings.push(`${file}:${ast.getLineAndCharacterOfPosition(node.pos).line + 1}: texte JSX « ${node.text.trim()} »`);
    if (ts.isJsxAttribute(node) && visibleAttributes.has(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer) && looksVisible(node.initializer.text)) findings.push(`${file}:${ast.getLineAndCharacterOfPosition(node.pos).line + 1}: attribut ${node.name.text} non traduit`);
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && uiCalls.has(node.expression.text) && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && looksVisible(node.arguments[0].text)) findings.push(`${file}:${ast.getLineAndCharacterOfPosition(node.pos).line + 1}: message ${node.expression.text} non traduit`);
    ts.forEachChild(node, visit);
  };
  visit(ast);
}
if (findings.length) { console.error(["Littéraux d’interface hors catalogue :", ...findings].join("\n")); process.exit(1); }
console.log(`Audit i18n UI réussi (${files.length} fichiers).`);
