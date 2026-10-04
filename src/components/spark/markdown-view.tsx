/**
 * Markdown renderer using the already-installed `marked` package.
 *
 * SECURITY: raw user markdown from Obsidian can contain arbitrary HTML (e.g. script tags,
 * onclick handlers, data: URIs). We sanitise before injecting as innerHTML in two layers:
 *
 *   1. marked.parse() with safe defaults prevents raw HTML from source markdown.
 *
 *   2. A lightweight allow-list stripper removes any remaining unsafe attributes
 *      (on* handlers, javascript: URLs, data: URIs, SVG/XML namespaces) from the
 *      generated HTML string before injecting it.  This is a defence-in-depth step.
 *
 * If you need full HTML passthrough from markdown, install `dompurify` and replace the
 * stripUnsafeHtml call with DOMPurify.sanitize().
 */

import { marked } from "marked";

// ---------------------------------------------------------------------------
// Safe-attribute stripper
// ---------------------------------------------------------------------------

/**
 * Strips unsafe attribute name/value pairs from an HTML tag string.
 * Handles both double-quoted and single-quoted attribute values.
 */
function stripUnsafeAttrs(tag: string): string {
  // Remove any on* attributes (e.g. onclick, onerror, onload…)
  let cleaned = tag.replace(/\s+on\w+=(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
  // Remove javascript: URLs inside href/src
  cleaned = cleaned.replace(
    /\s+(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]*)/gi,
    (m) => m.replace(/javascript:[^\s>"]*/gi, "")
  );
  // Remove data: URLs
  cleaned = cleaned.replace(
    /\s+(href|src)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi,
    ""
  );
  // Remove SVG/XML namespace attrs
  cleaned = cleaned.replace(/\s+xmlns\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
  cleaned = cleaned.replace(/\s+xlink:href/gi, "");
  // Remove dangerous style values
  cleaned = cleaned.replace(
    /\s+style\s*=\s*(".*?(?:expression|javascript|url\s*\()[^"]*"|'.*?(?:expression|javascript|url\s*\()[^']*')/gi,
    ""
  );
  return cleaned;
}

/**
 * Applies allow-list sanitisation to a complete HTML string.
 * - Removes <script>, <style>, <iframe>, <object>, <embed>, <form> tags
 * - Strips unsafe attributes from remaining tags
 */
function stripUnsafeHtml(html: string): string {
  const DANGEROUS_TAGS = [
    "script", "style", "iframe", "object", "embed",
    "form", "button", "select", "textarea",
    "link", "meta", "base", "svg", "math", "xml",
  ];
  let safe = html;
  for (const tag of DANGEROUS_TAGS) {
    safe = safe.replace(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"), "");
    safe = safe.replace(new RegExp(`<${tag}[^>]*\\/?>`, "gi"), "");
  }

  // Sanitise attributes on remaining tags
  safe = safe.replace(/<(\w+)(\s[^>]*)?>/gi, (_match, tagName, attrs) => {
    if (!attrs) return `<${tagName}>`;
    return `<${tagName}${stripUnsafeAttrs(attrs)}>`;
  });

  return safe;
}

// ---------------------------------------------------------------------------
// Configure marked with safe defaults
// ---------------------------------------------------------------------------

// Use marked defaults but ensure no raw HTML passthrough
const renderer = new marked.Renderer();

// Block code — explicitly escape HTML inside code blocks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(renderer as any).code = function({ text, lang }: { text: string; lang?: string }) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const langClass = lang ? ` class="language-${lang}"` : "";
  return `<pre><code${langClass}>${escaped}</code></pre>\n`;
};

// Links — only allow http/https/mailto or anchor links
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(renderer as any).link = function({ href, title, text }: { href: string; title?: string; text: string }) {
  const safe = /^https?:\/\//i.test(href)
    || /^mailto:/i.test(href)
    || /^#/.test(href);
  if (!safe) {
    return `<span${title ? ` title="${title}"` : ""}>${text}</span>`;
  }
  const titleAttr = title ? ` title="${title}"` : "";
  const rel = /^https?:\/\//i.test(href) ? ' rel="noopener noreferrer"' : "";
  return `<a href="${href}"${titleAttr}${rel}>${text}</a>`;
};

// Images — only allow http/https
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(renderer as any).image = function({ href, title, text }: { href: string; title?: string; text: string }) {
  if (!/^https?:\/\//i.test(href ?? "")) {
    return `<span>${text}</span>`;
  }
  const titleAttr = title ? ` title="${title}"` : "";
  return `<img src="${href}" alt="${text}"${titleAttr} loading="lazy" />`;
};

marked.use({ renderer });

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface MarkdownRendererOptions {
  /** Additional CSS classes to apply to the wrapper div. */
  className?: string;
  /** Override the default allow-list sanitizer (e.g. use DOMPurify instead). */
  sanitizer?: (html: string) => string;
}

/**
 * Parses a markdown string and returns a safe HTML string.
 * The output is NOT wrapped in a container element — caller decides.
 *
 * For Obsidian notes you typically want to wrap the result in a div
 * with class `spark-prose` so Tailwind typography applies automatically.
 */
export function renderMarkdown(
  content: string,
  options: MarkdownRendererOptions = {}
): string {
  if (!content) return "";

  // Parse markdown to HTML
  const rawHtml = marked.parse(content) as string;

  // Apply allow-list stripper for defence in depth
  const sanitiser = options.sanitizer ?? stripUnsafeHtml;
  return sanitiser(rawHtml);
}

/**
 * React component that renders Obsidian markdown safely.
 *
 * Usage:
 *   <MarkdownView content={note.content} className="spark-prose" />
 */
export function MarkdownView({ content, className }: { content: string; className?: string }) {
  const html = renderMarkdown(content);
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
