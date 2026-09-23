/**
 * XCapture Engine: Extract articles, web pages, or transcripts into Obsidian-ready Markdown notes.
 */

export interface CapturedArticle {
  title: string;
  sourceUrl?: string | undefined;
  summary: string;
  tags: string[];
  keyPoints: string[];
  markdown: string;
  createdAt: string;
}

export function parseAndCaptureContent(input: {
  text: string;
  url?: string | undefined;
  customTitle?: string | undefined;
}): CapturedArticle {
  const content = input.text.trim();
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  
  // Extract or synthesize title
  let title = input.customTitle?.trim() || "";
  if (!title) {
    if (lines[0] && lines[0].length < 100) {
      title = lines[0].replace(/^[#*-]\s*/, "");
    } else {
      title = "Erfasster Artikel " + new Date().toISOString().split("T")[0];
    }
  }

  // Extract key points
  const keyPoints: string[] = [];
  lines.forEach((line) => {
    if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
      keyPoints.push(line.replace(/^[-*•]\s*/, ""));
    }
  });

  if (keyPoints.length === 0) {
    // Generate synthetic key points from paragraphs
    lines.slice(0, 4).forEach((p) => {
      if (p.length > 20 && p.length < 250) {
        keyPoints.push(p);
      }
    });
  }

  // Summary
  const summary =
    lines.slice(0, 3).join(" ").slice(0, 320) + (content.length > 320 ? "…" : "");

  // Tags
  const tags: string[] = ["artikel", "capture"];
  const lower = content.toLowerCase();
  if (lower.includes("ai") || lower.includes("ki")) tags.push("ki");
  if (lower.includes("code") || lower.includes("react")) tags.push("programmierung");
  if (lower.includes("gesund") || lower.includes("vitamin")) tags.push("gesundheit");
  if (lower.includes("business") || lower.includes("startup")) tags.push("business");

  // Generate Obsidian Frontmatter & Markdown
  const frontmatter = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    input.url ? `source: "${input.url}"` : null,
    `captured: "${new Date().toISOString()}"`,
    `tags: [${tags.map((t) => `"${t}"`).join(", ")}]`,
    "---",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const markdown = `${frontmatter}# ${title}

## 📌 Zusammenfassung
${summary}

## 💡 Kernaussagen
${keyPoints.map((k) => `- ${k}`).join("\n")}

## 📝 Notizen & Kontext
${content}
`;

  return {
    title,
    sourceUrl: input.url,
    summary,
    tags,
    keyPoints,
    markdown,
    createdAt: new Date().toISOString(),
  };
}
