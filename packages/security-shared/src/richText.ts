const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "hr",
  "a",
  "img",
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);
const ALLOWED_ATTRIBUTES: Record<string, ReadonlySet<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  ol: new Set(["start"]),
};

const CONTROL_OR_MARKUP = /[\u0000-\u001f\u007f<>"'`]/;

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sanitizeUrl(value: string, kind: "link" | "image"): string | null {
  const normalized = value.trim();
  if (!normalized || CONTROL_OR_MARKUP.test(normalized)) return null;

  if (normalized.startsWith("#")) return kind === "link" ? normalized : null;
  if (normalized.startsWith("/") && !normalized.startsWith("//")) return normalized;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (kind === "link" && /^(mailto:|tel:)/i.test(normalized)) return normalized;

  return null;
}

function parseAttributes(source: string): Array<[string, string]> | null {
  const attributes: Array<[string, string]> = [];
  let cursor = 0;

  while (cursor < source.length) {
    while (/\s/.test(source[cursor] ?? "")) cursor += 1;
    if (cursor >= source.length) break;

    if (source[cursor] === "/") {
      cursor += 1;
      while (/\s/.test(source[cursor] ?? "")) cursor += 1;
      return cursor === source.length ? attributes : null;
    }

    const nameMatch = source.slice(cursor).match(/^[A-Za-z_:][A-Za-z0-9:._-]*/);
    if (!nameMatch) return null;
    const name = nameMatch[0].toLowerCase();
    cursor += nameMatch[0].length;

    while (/\s/.test(source[cursor] ?? "")) cursor += 1;
    if (source[cursor] !== "=") return null;
    cursor += 1;
    while (/\s/.test(source[cursor] ?? "")) cursor += 1;

    const quote = source[cursor];
    if (quote !== '"' && quote !== "'") return null;
    cursor += 1;
    const valueStart = cursor;
    while (cursor < source.length && source[cursor] !== quote) cursor += 1;
    if (cursor >= source.length) return null;

    attributes.push([name, source.slice(valueStart, cursor)]);
    cursor += 1;
  }

  return attributes;
}

function sanitizeAttributes(tag: string, attributes: Array<[string, string]>): string {
  const allowed = ALLOWED_ATTRIBUTES[tag] ?? new Set<string>();
  const safe: Array<[string, string]> = [];
  let targetBlank = false;
  let relTokens = new Set<string>();

  for (const [name, rawValue] of attributes) {
    if (!allowed.has(name)) continue;

    if (tag === "a" && name === "href") {
      const value = sanitizeUrl(rawValue, "link");
      if (value) safe.push([name, value]);
      continue;
    }

    if (tag === "img" && name === "src") {
      const value = sanitizeUrl(rawValue, "image");
      if (value) safe.push([name, value]);
      continue;
    }

    if (tag === "a" && name === "target") {
      const value = rawValue.trim().toLowerCase();
      if (value === "_blank" || value === "_self") {
        safe.push([name, value]);
        targetBlank = value === "_blank";
      }
      continue;
    }

    if (tag === "a" && name === "rel") {
      const allowedRel = new Set(["noopener", "noreferrer", "nofollow"]);
      relTokens = new Set(
        rawValue
          .toLowerCase()
          .split(/\s+/)
          .filter((token) => allowedRel.has(token)),
      );
      continue;
    }

    if ((name === "width" || name === "height") && !/^\d{1,4}$/.test(rawValue.trim())) {
      continue;
    }

    if (tag === "ol" && name === "start" && !/^-?\d{1,6}$/.test(rawValue.trim())) {
      continue;
    }

    safe.push([name, rawValue.trim()]);
  }

  if (tag === "a") {
    if (targetBlank) {
      relTokens.add("noopener");
      relTokens.add("noreferrer");
    }
    if (relTokens.size > 0) safe.push(["rel", [...relTokens].join(" ")]);
  }

  return safe.map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`).join("");
}

function readTag(html: string, start: number): { raw: string; end: number } | null {
  let quote: '"' | "'" | null = null;

  for (let cursor = start + 1; cursor < html.length; cursor += 1) {
    const char = html[cursor];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "<") return null;
    if (char === ">") return { raw: html.slice(start, cursor + 1), end: cursor };
  }

  return null;
}

function sanitizeTag(raw: string): string {
  const closing = raw.match(/^<\s*\/\s*([A-Za-z][A-Za-z0-9]*)\s*>$/);
  if (closing) {
    const tag = closing[1].toLowerCase();
    return ALLOWED_TAGS.has(tag) && !VOID_TAGS.has(tag) ? `</${tag}>` : "";
  }

  const opening = raw.match(/^<\s*([A-Za-z][A-Za-z0-9]*)([\s\S]*?)>$/);
  if (!opening) return "";

  const tag = opening[1].toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) return "";

  const attributes = parseAttributes(opening[2]);
  if (!attributes) return "";

  return `<${tag}${sanitizeAttributes(tag, attributes)}>`;
}

/**
 * Normalise du HTML riche provenant des éditeurs internes avant qu'il soit
 * réinjecté avec `dangerouslySetInnerHTML`. Seule une petite grammaire proche
 * de la sortie Tiptap est conservée ; tout élément/attribut non explicitement
 * autorisé est supprimé. Les URL sont allowlistées par protocole.
 *
 * La fonction est volontairement pure et sans dépendance DOM afin d'être
 * utilisable à la fois dans les Server Actions et dans les Server Components.
 */
export function sanitizeRichTextHtml(html: string): string {
  let output = "";
  let cursor = 0;

  while (cursor < html.length) {
    const nextTag = html.indexOf("<", cursor);
    if (nextTag === -1) {
      output += html.slice(cursor);
      break;
    }

    output += html.slice(cursor, nextTag);
    const token = readTag(html, nextTag);
    if (!token) {
      output += "&lt;";
      cursor = nextTag + 1;
      continue;
    }

    output += sanitizeTag(token.raw);
    cursor = token.end + 1;
  }

  return output;
}
