import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import { safe, SafeHtml } from "#html";

function parseYaml(yaml: string): Record<string, string> {
  const data: Record<string, string> = {};
  for (const line of yaml.split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line
      .slice(colon + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key) data[key] = value;
  }
  return data;
}

function textContent(node: any): string {
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(textContent).join("");
}

function remarkExtractFrontmatter() {
  return (tree: any, file: any) => {
    const yaml = tree.children.find((n: any) => n.type === "yaml");
    const frontmatter = yaml ? parseYaml(yaml.value) : {};
    if (!frontmatter.description) {
      const para = tree.children.find((n: any) => n.type === "paragraph");
      if (para) frontmatter.description = textContent(para).trim();
    }
    file.data.frontmatter = frontmatter;
  };
}

export interface ParsedPage {
  html: SafeHtml;
  frontmatter: Record<string, string>;
}

function rehypeHighlightCode() {
  return (tree: any) => {
    function walk(node: any, parent: any, index: number) {
      if (node.type === "element" && node.tagName === "pre") {
        const code = (node.children ?? []).find(
          (child: any) => child.type === "element" && child.tagName === "code",
        );
        const meta = code?.data?.meta as string | undefined;
        const isTerminal = meta === "terminal";
        const filename = !isTerminal ? meta : undefined;

        node.properties["x-data"] = "copyCode";
        node.properties.className = [
          ...(node.properties.className ?? []),
          "code-block",
        ];

        const replacement: any[] = [];

        if (isTerminal) {
          node.properties.className.push("code-terminal");
          replacement.push({
            type: "element",
            tagName: "div",
            properties: { className: ["code-terminal-header"] },
            children: [
              {
                type: "element",
                tagName: "div",
                properties: { className: ["code-terminal-dots"] },
                children: [
                  {
                    type: "element",
                    tagName: "span",
                    properties: { className: ["dot", "dot-red"] },
                    children: [],
                  },
                  {
                    type: "element",
                    tagName: "span",
                    properties: { className: ["dot", "dot-yellow"] },
                    children: [],
                  },
                  {
                    type: "element",
                    tagName: "span",
                    properties: { className: ["dot", "dot-green"] },
                    children: [],
                  },
                ],
              },
            ],
          });
        } else if (filename) {
          replacement.push({
            type: "element",
            tagName: "div",
            properties: { className: ["code-filename"] },
            children: [{ type: "text", value: filename }],
          });
        }

        replacement.push({
          type: "element",
          tagName: "micro-lighter",
          properties: isTerminal ? {} : { "line-numbers": true },
          children: [node],
        });

        if (parent) {
          parent.children.splice(index, 1, ...replacement);
        }
      }
      if (node.children) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          walk(node.children[i], node, i);
        }
      }
    }
    walk(tree, null, 0);
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter)
  .use(remarkExtractFrontmatter)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeHighlightCode)
  .use(rehypeStringify)
  .freeze();

export async function parseMarkdown(markdown: string): Promise<ParsedPage> {
  const file = await processor.process(markdown);
  const frontmatter = (file.data.frontmatter ?? {}) as Record<string, string>;
  return { html: safe(String(file)), frontmatter };
}
