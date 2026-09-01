---
description: How to write Markdown and TypeScript pages, set page frontmatter, use file-based routing, label and order sidebar links, and serve static assets.
---

# Writing pages

Pages live in the `pages/` directory. Two file types are supported.

## Markdown pages

Files ending in `.md` are processed through a remark/rehype pipeline with syntax highlighting via Shiki.

```sh
pages/index.md
pages/guide/installation.md  →  /guide/installation
```

Standard CommonMark syntax works as expected. Code blocks are highlighted automatically based on the language tag:

````md
```ts
const greeting = "hello";
```
````

## Frontmatter

A markdown page can start with a YAML frontmatter block. It is stripped from the rendered output and used as page metadata.

```md 4-deployment.md
---
label: Deploying
description: How to deploy your site to GitHub Pages.
---

# Deployment
```

| Key           | Effect                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------- |
| `label`       | Text used for this page's link in the sidebar. Defaults to the filename.                   |
| `description` | Shown under the page title in search results. Defaults to the page's first paragraph.      |

Frontmatter is markdown-only — `.ts` pages have no equivalent, so their sidebar links always use the filename.

### Naming sidebar links

Sidebar links are labelled with the filename by default, which keeps them short but lowercase and hyphenated. Set `label` when you want something more readable:

```md 1-installation.md
---
label: Getting started
---

# Installation
```

The link now reads "Getting started", while the route stays `/guide/installation` — `label` never affects the URL. On a section's index page, `label` replaces the default `overview` link text.

## TypeScript pages

Files ending in `.ts` can export a `SafeHtml` value directly. Import the `html` tagged template from `@erikt/docgen` to build the content:

```ts
import { html } from "@erikt/docgen";

export default html`
  <h1>Custom page</h1>
  <p>This page is written in TypeScript.</p>
`;
```

Values interpolated into `html\`\``are HTML-escaped by default. Wrap trusted markup in`safe()` to bypass escaping.

## File-based routing

Each file maps to a URL path based on its location under `pages/`:

| File                          | Route                 |
| ----------------------------- | --------------------- |
| `pages/index.md`              | `/`                   |
| `pages/about.md`              | `/about`              |
| `pages/guide/index.md`        | `/guide`              |
| `pages/guide/installation.md` | `/guide/installation` |

## Ordering pages

Prefix a filename with a number to control the order it appears in the sidebar:

```sh
pages/guide/1-installation.md
pages/guide/2-configuration.md
pages/guide/3-pages.md
```

The prefix is stripped from both the URL and the displayed link text. Unprefixed files are sorted alphabetically after prefixed ones. To change the link text itself, use the `label` frontmatter key rather than renaming the file.

## Sidebar navigation

Any directory under `pages/` automatically generates a sidebar listing its pages. The sidebar appears on all pages within that directory, including the section index.

The section heading comes from the directory name, and each link is labelled with its filename — override a single link with the [`label` frontmatter key](#naming-sidebar-links).

## Static assets

Place files in a `public/` folder at your project root and they will be copied to `dist/` on build and served as-is by the dev server.
