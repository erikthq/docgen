import { html, SafeHtml } from "#html";
import { siteHeader, type NavItem } from "./components/site-header.ts";
import { sidebar } from "./components/sidebar.ts";
import { toc } from "./components/toc.ts";
import { searchDialog } from "./components/search.ts";

export async function layout(
  routes: Map<string, SafeHtml>,
  structure: NavItem[] | undefined,
  currentRoute: string,
  content: SafeHtml,
  favicon = "/favicon.jpg",
  base = "",
): Promise<SafeHtml> {
  const header = await siteHeader(routes, structure, base);
  const aside = sidebar(routes, currentRoute, base);
  const tocNav = await toc(content);

  const h1Match = content.value.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const pageTitle = h1Match
    ? h1Match[1].replace(/<[^>]+>/g, "").trim() + " – Docgen"
    : "Docgen";

  return html`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="docgen-base" content="${base}" />
        <title>${pageTitle}</title>
        <link rel="icon" href="${favicon}" />
        <link rel="stylesheet" href="https://esm.sh/@erikt/ui" />
        <link rel="stylesheet" href="/docgen.css" />

        <script type="importmap">
          {
            "imports": {
              "alpinejs": "https://esm.sh/alpinejs@3.15.12",
              "@alpinejs/persist": "https://esm.sh/@alpinejs/persist@3.15.12",
              "minisearch": "https://esm.sh/minisearch@7"
            }
          }
        </script>

        <script type="module">
          import Alpine from "alpinejs";
          import persist from "@alpinejs/persist";

          Alpine.plugin(persist);
        </script>

        <script src="/copy-code.js" type="module"></script>
      </head>
      <body>
        ${header}

        <main>
          ${aside.value && html`<nav>${aside}</nav>`}
          ${currentRoute === "/"
            ? content
            : html`<section>
                <div class="prose">${content}</div>
              </section>`}
          ${currentRoute !== "/" &&
          tocNav.value &&
          html`<aside>${tocNav}</aside>`}
        </main>

        <script type="module">
          import Alpine from "alpinejs";

          Alpine.start();
        </script>

        ${searchDialog}
      </body>
    </html>`;
}
