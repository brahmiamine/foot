import { describe, expect, it } from "vitest";
import { sanitizeRichTextHtml } from "./richTextSecurity";

describe("sanitizeRichTextHtml", () => {
  it("preserves the supported Tiptap formatting subset", () => {
    const html = '<h2>Titre</h2><p><strong>Bonjour</strong> <a href="https://example.com" target="_blank">lien</a></p><ul><li>Un</li></ul>';
    const sanitized = sanitizeRichTextHtml(html);

    expect(sanitized).toContain("<h2>Titre</h2>");
    expect(sanitized).toContain("<strong>Bonjour</strong>");
    expect(sanitized).toContain('href="https://example.com"');
    expect(sanitized).toContain('rel="noopener noreferrer"');
    expect(sanitized).toContain("<ul><li>Un</li></ul>");
  });

  it("removes executable markup, event handlers, styles and unsafe URL schemes", () => {
    const html = [
      '<p style="background:url(javascript:alert(1))" onclick="alert(1)">Texte</p>',
      '<a href="javascript:alert(2)" onmouseover="alert(3)">dangereux</a>',
      '<a href="jav&#x61;script:alert(4)">entity</a>',
      '<img src="data:image/svg+xml,<svg onload=alert(5)>" onerror="alert(6)">',
      '<script>alert(7)</script>',
      '<iframe src="https://evil.example"></iframe>',
      '<svg><a href="javascript:alert(8)">svg</a></svg>',
    ].join("");

    const sanitized = sanitizeRichTextHtml(html);

    expect(sanitized).not.toMatch(/<script|<iframe|<svg/i);
    expect(sanitized).not.toMatch(/\son\w+\s*=/i);
    expect(sanitized).not.toContain("style=");
    expect(sanitized).not.toMatch(/javascript:/i);
    expect(sanitized).not.toMatch(/src="data:/i);
    expect(sanitized).toContain("<p>Texte</p>");
    expect(sanitized).toContain("<a>dangereux</a>");
  });

  it("does not let malformed nested markup escape the allowlist", () => {
    const sanitized = sanitizeRichTextHtml('<a href="https://example.com" <img src="x" onerror="alert(1)">');

    expect(sanitized).not.toMatch(/onerror/i);
    expect(sanitized).not.toMatch(/javascript:/i);
  });
});
