import { createServer, IncomingMessage, ServerResponse } from "node:http";
import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  access,
  cp,
  rm,
} from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { html, safe, SafeHtml } from "#html";
import { parseMarkdown } from "./utils/parseMarkdown.js";
import { serveStatic } from "./utils/serveStatic.js";
import { buildSearchIndex } from "./utils/buildSearchIndex.js";
import { icon } from "./utils/icons.js";
import { layout } from "./layout.js";
import { type NavItem } from "./components/site-header.js";
import ErrorPage from "./components/error.js";

export { html, safe, icon };
export type { NavItem };

export interface Config {
  pagesDir?: string;
  outDir?: string;
  base?: string;
  structure?: NavItem[];
  githubLink?: string;
  siteName?: string;
  port?: number;
  brandColor?: string;
}

const corePublicDir = fileURLToPath(new URL("./public", import.meta.url));

const FAVICON_EXTS = ["ico", "svg", "png", "jpg", "jpeg"];

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function findFavicon(userPublicDir: string): Promise<string> {
  for (const ext of FAVICON_EXTS) {
    if (await pathExists(join(userPublicDir, `favicon.${ext}`))) {
      return `/favicon.${ext}`;
    }
  }
  return "/favicon.jpg";
}

function sortKey(name: string): number {
  const n = parseInt(name);
  return isNaN(n) ? Infinity : n;
}

async function scanPages(dir: string, base: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort(
    (a, b) => sortKey(a.name) - sortKey(b.name) || a.name.localeCompare(b.name),
  );
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return scanPages(full, base);
      if (entry.name.endsWith(".md") || entry.name.endsWith(".ts"))
        return Promise.resolve([full]);
      return Promise.resolve([]);
    }),
  );
  return nested.flat();
}

function fileToRoute(filePath: string, pagesDir: string): string {
  const rel = filePath.slice(pagesDir.length + 1).replace(/\\/g, "/");
  const withoutExt = rel.slice(0, -extname(rel).length);
  const stripped = withoutExt
    .split("/")
    .map((seg) => seg.replace(/^\d+-/, ""))
    .join("/");
  const normalized = stripped.replace(/(^|\/)index$/, "");
  return "/" + normalized;
}

const perf = process.env.DOCGEN_PERF === "1";

async function buildPages(pagesDir: string) {
  console.log("scanning pages...");
  const t0 = perf ? performance.now() : 0;
  const files = await scanPages(pagesDir, pagesDir);
  if (perf)
    console.log(
      `[perf] scanPages total: ${(performance.now() - t0).toFixed(1)}ms`,
    );

  const entries = await Promise.all(
    files.map(async (filePath) => {
      const ext = extname(filePath);
      const route = fileToRoute(filePath, pagesDir);
      const t0 = perf ? performance.now() : 0;
      if (ext === ".md") {
        const parsed = await parseMarkdown(await readFile(filePath, "utf-8"));
        if (perf)
          console.log(
            `  [perf] ${(performance.now() - t0).toFixed(1)}ms  ${route} (md)`,
          );
        return {
          route,
          content: parsed.html,
          description: parsed.frontmatter.description ?? "",
          label: parsed.frontmatter.label ?? "",
        };
      }
      const content = (await import(pathToFileURL(filePath).href))
        .default as SafeHtml;
      if (perf)
        console.log(
          `  [perf] ${(performance.now() - t0).toFixed(1)}ms  ${route} (ts)`,
        );
      return { route, content, description: "", label: "" };
    }),
  );

  const routes = new Map(entries.map(({ route, content }) => [route, content]));
  const descriptions = new Map(
    entries.map(({ route, description }) => [route, description]),
  );
  const labels = new Map(
    entries.filter(({ label }) => label).map(({ route, label }) => [route, label]),
  );

  return { routes, descriptions, labels };
}

export async function defineDocs(config: Config): Promise<Config> {
  if (resolve(process.argv[1]) === resolve("docs.config.ts")) {
    await createDocs(config);
  }
  return config;
}

export async function createDocs({
  pagesDir,
  structure,
  base: rawBase,
  githubLink,
  siteName,
  port = 5151,
  brandColor,
}: Config = {}) {
  const base = rawBase ? `/${rawBase.replace(/^\/|\/$/g, "")}` : "";
  const userPublicDir = resolve("public");
  console.log("building pages...");
  const t0 = perf ? performance.now() : 0;
  const { routes, descriptions, labels } = await buildPages(
    pagesDir ?? resolve("pages"),
  );
  if (perf)
    console.log(
      `[perf] buildPages total: ${(performance.now() - t0).toFixed(1)}ms`,
    );
  console.log("building search index...");
  const t1 = perf ? performance.now() : 0;
  const favicon = await findFavicon(userPublicDir);
  const searchIndexJson = buildSearchIndex(routes, descriptions);
  if (perf)
    console.log(
      `[perf] searchIndex + favicon: ${(performance.now() - t1).toFixed(1)}ms`,
    );
  console.log("starting server...");

  const server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const raw = req.url ?? "/";
      const urlPath =
        base && raw.startsWith(base) ? raw.slice(base.length) || "/" : raw;

      if (urlPath === "/search-index.json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(searchIndexJson);
        return;
      }

      if (await serveStatic([userPublicDir, corePublicDir], urlPath, res))
        return;

      const content = routes.get(urlPath);

      if (content === undefined) {
        const firstChild = [...routes.keys()].find((r) =>
          r.startsWith(urlPath + "/"),
        );

        if (firstChild) {
          res.writeHead(302, { Location: base + firstChild });
          res.end();
          return;
        }
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(
          `${await layout(routes, labels, structure, urlPath, ErrorPage, favicon, base, githubLink, siteName, brandColor)}`,
        );
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `${await layout(routes, labels, structure, urlPath, content, favicon, base, githubLink, siteName, brandColor)}`,
      );
    },
  );

  server.listen(port, () => {
    console.log(`listening on http://localhost:${port}` + base);
    // for (const route of routes.keys()) {
    //   console.log(`  ${route}`);
    // }
  });

  return server;
}

export async function buildDocs({
  pagesDir,
  outDir,
  structure,
  base: rawBase,
  githubLink,
  siteName,
  brandColor,
}: Config = {}) {
  console.log(`   ▄▄
   ██
▄████ ▄███▄ ▄████ ▄████ ▄█▀█▄ ████▄
██ ██ ██ ██ ██    ██ ██ ██▄█▀ ██ ██
▀████ ▀███▀ ▀████ ▀████ ▀█▄▄▄ ██ ██
                     ██
                   ▀▀▀`);

  const base = rawBase ? `/${rawBase.replace(/^\/|\/$/g, "")}` : "";
  const resolvedOut = outDir ?? resolve("dist");
  const userPublicDir = resolve("public");
  const { routes, descriptions, labels } = await buildPages(
    pagesDir ?? resolve("pages"),
  );
  const favicon = await findFavicon(userPublicDir);
  const searchIndexJson = buildSearchIndex(routes, descriptions);

  await rm(resolvedOut, { recursive: true, force: true });
  await mkdir(resolvedOut, { recursive: true });
  await writeFile(join(resolvedOut, ".nojekyll"), "");
  await writeFile(join(resolvedOut, "search-index.json"), searchIndexJson);

  for (const dir of [corePublicDir, userPublicDir]) {
    if (await pathExists(dir)) await cp(dir, resolvedOut, { recursive: true });
  }

  const allRoutes = [...routes.keys()];
  const folderRoutes = new Set(
    allRoutes
      .filter((r) => r !== "/")
      .map((r) => r.split("/").slice(0, -1).join("/") || "/")
      .filter((parent) => parent !== "/" && !routes.has(parent)),
  );

  for (const folder of folderRoutes) {
    const firstChild = allRoutes.find((r) => r.startsWith(folder + "/"));
    if (!firstChild) continue;
    const target = base + firstChild;
    const dir = join(resolvedOut, folder);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "index.html"),
      `<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${target}"></head><body></body></html>`,
    );
    console.log(`  redirect ${folder} → ${firstChild}`);
  }

  for (const [route, content] of routes) {
    const dir = route === "/" ? resolvedOut : join(resolvedOut, route);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "index.html"),
      `${await layout(routes, labels, structure, route, content, favicon, base, githubLink, siteName, brandColor)}`,
    );
    console.log(`  built ${route}`);
  }

  console.log(`\ndone → ${resolvedOut}`);
}
