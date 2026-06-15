import { html, safe, SafeHtml } from "#html";
import { icon } from "../utils/icons.ts";
import schemeToggle from "./scheme-toggle.ts";
import { searchTrigger } from "./search.ts";

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

function isActive(path: string, currentRoute: string): boolean {
  return currentRoute === path || currentRoute.startsWith(path + "/");
}

async function buildNav(
  routes: Map<string, SafeHtml>,
  base: string,
  currentRoute: string,
  structure?: NavItem[],
): Promise<SafeHtml> {
  if (!structure) {
    return safe(
      [...routes.keys()]
        .map((route) => {
          const active = isActive(route, currentRoute);
          return `<a href="${base}${route}" class="button ghost"${active ? ' aria-current="page"' : ""}>${route === "/" ? "home" : route.slice(1)}</a>`;
        })
        .join("\n"),
    );
  }

  const links = await Promise.all(
    structure.map(async ({ label, path, icon: iconName }) => {
      const svg = await icon(iconName);
      const active = isActive(path, currentRoute);
      return `<a href="${base}${path}" class="button ghost"${active ? ' aria-current="page"' : ""}>${svg.value}${label}</a>`;
    }),
  );

  return safe(links.join("\n"));
}

export async function siteHeader(
  routes: Map<string, SafeHtml>,
  structure?: NavItem[],
  base = "",
  currentRoute = "",
): Promise<SafeHtml> {
  const nav = await buildNav(routes, base, currentRoute, structure);

  return html`
    <header>
      <a href="${base}/" aria-label="Homepage">
        <img src="${base}/logo.jpg" />
      </a>

      <nav>${nav}</nav>

      <aside>
        ${searchTrigger}
        ${schemeToggle}

        <a
          id="github-link"
          href="https://github.com/erikthq/ui"
          target="_blank"
          rel="noopener"
          class="button secondary square"
          aria-label="GitHub"
          data-tooltip="bottom"
        >
          ${await icon("brand-github")}
        </a>
      </aside>
    </header>
  `;
}
