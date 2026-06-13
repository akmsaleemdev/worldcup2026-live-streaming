/**
 * Minimal, safe Markdown → HTML renderer (pure, no IO, no dependencies).
 *
 * The Content_Editor authors article bodies in a lightweight Markdown dialect
 * (a deliberate choice over a heavyweight WYSIWYG library so the bundle stays
 * small and builds cleanly on React 19 / Next 16 — see task 12.5 notes). This
 * renderer converts that Markdown to HTML for the public article page.
 *
 * Safety: the input is HTML-escaped FIRST, so any raw HTML or angle brackets in
 * the source become inert text. Only the small, fixed set of inline/block
 * constructs below is then re-introduced as real tags. This makes the output
 * safe to inject via `dangerouslySetInnerHTML` even though article content is
 * authored by trusted editors — defense in depth against stored XSS.
 *
 * Supported constructs:
 *   - Headings:        `## H2`, `### H3`  (h1 reserved for the page title)
 *   - Bold / italic:   `**bold**`, `*italic*`
 *   - Inline code:     `` `code` ``
 *   - Links:           `[text](https://… )` (http/https only)
 *   - Unordered lists: lines beginning with `- ` or `* `
 *   - Ordered lists:   lines beginning with `1. `
 *   - Blockquotes:     lines beginning with `> `
 *   - Paragraphs:      blank-line-separated blocks
 */

/** Escape the five HTML-significant characters. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Apply inline formatting to an already-HTML-escaped line: links, bold,
 * italic, and inline code. Order matters — inline code is extracted first so
 * its contents are not further transformed.
 */
function renderInline(escaped: string): string {
  let out = escaped;

  // Inline code: `code`
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);

  // Links: [text](url) — only safe http/https (or protocol-relative) targets.
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, text: string, url: string) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`,
  );

  // Bold: **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  return out;
}

/** A parsed block of source Markdown. */
type Block = string[];

/** Split the source into blocks separated by one or more blank lines. */
function splitBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    blocks.push(current);
  }
  return blocks;
}

/** Render a single block (heading, list, blockquote, or paragraph) to HTML. */
function renderBlock(block: Block): string {
  const escaped = block.map((line) => escapeHtml(line));
  const first = escaped[0];

  // Headings (single-line blocks).
  if (escaped.length === 1) {
    const h3 = first.match(/^###\s+(.*)$/);
    if (h3) return `<h3>${renderInline(h3[1])}</h3>`;
    const h2 = first.match(/^##\s+(.*)$/);
    if (h2) return `<h2>${renderInline(h2[1])}</h2>`;
  }

  // Unordered list: every line begins with "- " or "* ".
  if (escaped.every((l) => /^[-*]\s+/.test(l))) {
    const items = escaped
      .map((l) => `<li>${renderInline(l.replace(/^[-*]\s+/, ""))}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  }

  // Ordered list: every line begins with "N. ".
  if (escaped.every((l) => /^\d+\.\s+/.test(l))) {
    const items = escaped
      .map((l) => `<li>${renderInline(l.replace(/^\d+\.\s+/, ""))}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  }

  // Blockquote: every line begins with "> ".
  if (escaped.every((l) => /^&gt;\s?/.test(l))) {
    const inner = escaped
      .map((l) => renderInline(l.replace(/^&gt;\s?/, "")))
      .join("<br />");
    return `<blockquote>${inner}</blockquote>`;
  }

  // Default: a paragraph; intra-block line breaks become <br />.
  const para = escaped.map((l) => renderInline(l)).join("<br />");
  return `<p>${para}</p>`;
}

/**
 * Render a Markdown string to a safe HTML string.
 *
 * The result contains only the fixed set of tags this renderer emits; all
 * source HTML is escaped before formatting is applied.
 */
export function renderMarkdown(source: string): string {
  if (typeof source !== "string" || source.trim().length === 0) {
    return "";
  }
  return splitBlocks(source).map(renderBlock).join("\n");
}
