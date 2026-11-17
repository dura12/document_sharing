import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "./export";

describe("Document Export Utilities", () => {
  it("converts HTML headings and bold/italic text into Markdown", () => {
    const html = "<h1>Project Proposal</h1><p>This is <strong>critical</strong> and <em>urgent</em>.</p>";
    const md = htmlToMarkdown(html);

    expect(md).toContain("# Project Proposal");
    expect(md).toContain("**critical**");
    expect(md).toContain("*urgent*");
  });

  it("converts bulleted and ordered lists into Markdown", () => {
    const html = "<ul><li>Task A</li><li>Task B</li></ul>";
    const md = htmlToMarkdown(html);

    expect(md).toContain("- Task A");
    expect(md).toContain("- Task B");
  });

  it("converts blockquotes and code blocks into Markdown", () => {
    const html = "<blockquote>A famous quote</blockquote><pre>const x = 10;</pre>";
    const md = htmlToMarkdown(html);

    expect(md).toContain("> A famous quote");
    expect(md).toContain("```\nconst x = 10;\n```");
  });

  it("converts links and images into Markdown format", () => {
    const html = '<p><a href="https://google.com">Google</a> and <img src="image.png" alt="Graph" /></p>';
    const md = htmlToMarkdown(html);

    expect(md).toContain("[Google](https://google.com)");
    expect(md).toContain("![Graph](image.png)");
  });
});
