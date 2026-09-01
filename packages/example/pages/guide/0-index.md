---
description: An overview of what docgen does, who it's for, and the philosophy behind its design.
---

# erikt/docgen

A minimal documentation site generator built on Node.js native TypeScript. Point it at a folder of markdown files and get a running site with zero configuration.

## Features

- **File-based routing** — `.md` and `.ts` files in `pages/` become routes automatically
- **Markdown** — full CommonMark with syntax highlighting via Shiki
- **No build step** — runs TypeScript directly via Node.js `>=23.6.0`
- **Static output** — `docgen build` generates a GitHub Pages-compatible `dist/`
- **Sidebar navigation** — nested directories automatically produce section sidebars, with link text set per page via frontmatter
- **Table of contents** — headings on each page are linked in a right-hand column
- **Light / dark / system** colour scheme with localStorage persistence

## Quick start

```bash terminal
pnpm add @erikt/docgen
```

Create `docs.config.ts` in your project root:

```ts docs.config.ts
import { defineDocs } from "@erikt/docgen";

export default defineDocs({
  structure: [{ label: "Guide", path: "/guide", icon: "book" }],
});
```

Add scripts to `package.json`:

```json package.json
{
  "scripts": {
    "dev": "docgen dev",
    "build": "docgen build"
  }
}
```

Then run:

```bash
pnpm dev
# Listening on http://localhost:5151
```

# Introduction

docgen is a documentation site generator for people who want a fast, readable site without pulling in a framework. It is intentionally small — it does one thing and tries to stay out of your way.

## What it does

You give it a folder of Markdown files. It gives you a working website with routing, navigation, syntax highlighting, a table of contents, and light/dark mode. During development it runs a local server that restarts on file changes. When you're ready to ship, it writes a folder of static HTML files that can be deployed anywhere static files are served.

## Who it's for

docgen is aimed at developers who are documenting libraries, tools, or internal projects and want something they can understand end-to-end. If you've ever wanted to just write Markdown and not spend an afternoon configuring webpack, this is for that.

## The philosophy

### No build step

docgen runs TypeScript directly using Node.js `>=23.6.0`'s native strip-only mode. There is no `tsc`, no `esbuild`, no `babel`. The source files you write are the files that run. This keeps the feedback loop short and the dependency count low.

### Lean on the platform

Where possible, docgen uses what the runtime already provides — `node:http` for the server, `node:fs` for file watching, `node:path` for routing. On the browser side, modern CSS features like `color-scheme`, `light-dark()`, and CSS custom properties replace what would otherwise be JavaScript-managed theme logic.

### Minimal dependencies

The dependency list is short on purpose. Markdown processing uses the unified/remark/rehype ecosystem. Syntax highlighting uses Shiki. Icons are loaded on demand from a CDN and disk-cached. Nothing is bundled that doesn't need to be.

### Output you can read

The generated HTML is straightforward. There is no hydration, no client-side routing, no virtual DOM. A page is a file. A link is a link. The result deploys to GitHub Pages or any static host with no special configuration.
