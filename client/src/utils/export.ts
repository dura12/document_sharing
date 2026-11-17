import type Quill from "quill";

/**
 * Converts HTML content from Quill into clean Markdown format.
 * Works across both browser environments and unit tests without DOM dependencies.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return "";

  let md = html;

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n\n");
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "\n##### $1\n\n");
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "\n###### $1\n\n");

  // Bold, Italics, Underline, Strikethrough
  md = md.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, "**$2**");
  md = md.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, "*$2*");
  md = md.replace(/<(u)[^>]*>(.*?)<\/(u)>/gi, "<u>$2</u>");
  md = md.replace(/<(s|strike)[^>]*>(.*?)<\/(s|strike)>/gi, "~~$2~~");

  // Blockquotes and Code
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "\n> $1\n\n");
  md = md.replace(/<pre[^>]*>(.*?)<\/pre>/gi, "\n```\n$1\n```\n\n");
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");

  // Links and Images
  md = md.replace(
    /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
    "[$2]($1)",
  );
  md = md.replace(
    /<img\s+(?:[^>]*?\s+)?src="([^"]*)"(?:\s+alt="([^"]*)")?[^>]*\/?>/gi,
    "![$2]($1)",
  );

  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?(ul|ol)[^>]*>/gi, "\n");

  // Paragraphs & Linebreaks
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "\n$1\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");

  // Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");

  // Clean excessive blank lines and whitespace
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Trigger browser file download with blob.
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export document as standard Markdown file (.md)
 */
export function exportToMarkdown(title: string, quill: Quill | null): void {
  if (!quill) return;
  const html = quill.root.innerHTML;
  const markdown = htmlToMarkdown(html);
  const safeTitle =
    (title || "Untitled Document").replace(/[^\w\s-]/g, "").trim() || "document";
  downloadFile(markdown, `${safeTitle}.md`, "text/markdown;charset=utf-8;");
}

/**
 * Export document as HTML file (.html)
 */
export function exportToHtml(title: string, quill: Quill | null): void {
  if (!quill) return;
  const safeTitle =
    (title || "Untitled Document").replace(/[^\w\s-]/g, "").trim() || "document";
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title || "Untitled Document"}</title>
  <style>
    body { font-family: Roboto, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    blockquote { border-left: 3px solid #4285F4; margin: 0; padding-left: 16px; color: #555; }
    code { background-color: #f1f3f4; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <h1>${title || "Untitled Document"}</h1>
  ${quill.root.innerHTML}
</body>
</html>`;

  downloadFile(htmlContent, `${safeTitle}.html`, "text/html;charset=utf-8;");
}

/**
 * Export document as plain text (.txt)
 */
export function exportToTxt(title: string, quill: Quill | null): void {
  if (!quill) return;
  const safeTitle =
    (title || "Untitled Document").replace(/[^\w\s-]/g, "").trim() || "document";
  const text = quill.getText();
  downloadFile(text, `${safeTitle}.txt`, "text/plain;charset=utf-8;");
}

/**
 * Export document as PDF using browser printing engine styled for US Letter.
 */
export function exportToPdf(title: string): void {
  const originalDocTitle = document.title;
  document.title = `${title || "Untitled Document"}`;
  window.print();
  document.title = originalDocTitle;
}
