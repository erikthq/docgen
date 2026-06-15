import { createServer, IncomingMessage, ServerResponse } from "node:http";
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  cpSync,
  rmSync,
  Dirent,
} from "node:fs";
import { join, extname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { html, safe, SafeHtml } from "#html";
import { parseMarkdown } from "./utils/parseMarkdown.ts";
import { serveStatic } from "./utils/serveStatic.ts";
import { buildSearchIndex } from "./utils/buildSearchIndex.ts";
import { layout } from "./layout.ts";
import { type NavItem } from "./components/site-header.ts";
import ErrorPage from "./components/error.ts";

export { html, safe };
export type { NavItem };

export interface Config {
  pagesDir?: string;
  outDir?: string;
  base?: string;
  structure?: NavItem[];
}

const corePublicDir = fileURLToPath(new URL("../public", import.meta.url));

const FAVICON_EXTS = ["ico", "svg", "png", "jpg", "jpeg"];

function findFavicon(userPublicDir: string): string {
  for (const ext of FAVICON_EXTS) {
    if (existsSync(join(userPublicDir, `favicon.${ext}`))) {
      return `/favicon.${ext}`;
    }
  }
  return "/favicon.jpg";
}

function sortKey(name: string): number {
  const n = parseInt(name);
  return isNaN(n) ? Infinity : n;
}

function scanPages(dir: string, base: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  entries.sort(
    (a, b) => sortKey(a.name) - sortKey(b.name) || a.name.localeCompare(b.name),
  );
  return entries.flatMap((entry: Dirent) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return scanPages(full, base);
    if (entry.name.endsWith(".md") || entry.name.endsWith(".ts")) return [full];
    return [];
  });
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

async function buildPages(pagesDir: string) {
  const files = scanPages(pagesDir, pagesDir);

  const entries = await Promise.all(
    files.map(async (filePath) => {
      const ext = extname(filePath);
      const route = fileToRoute(filePath, pagesDir);
      if (ext === ".md") {
        const parsed = await parseMarkdown(readFileSync(filePath, "utf-8"));
        return {
          route,
          content: parsed.html,
          description: parsed.frontmatter.description ?? "",
        };
      }
      const content = (await import(pathToFileURL(filePath).href))
        .default as SafeHtml;
      return { route, content, description: "" };
    }),
  );

  const routes = new Map(entries.map(({ route, content }) => [route, content]));
  const descriptions = new Map(
    entries.map(({ route, description }) => [route, description]),
  );

  return { routes, descriptions };
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
}: Config = {}) {
  const base = rawBase ? `/${rawBase.replace(/^\/|\/$/g, "")}` : "";
  const userPublicDir = resolve("public");
  console.log("building pages...");
  const { routes, descriptions } = await buildPages(
    pagesDir ?? resolve("pages"),
  );
  console.log("building search index...");
  const favicon = findFavicon(userPublicDir);
  const searchIndexJson = buildSearchIndex(routes, descriptions);
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

      if (serveStatic([userPublicDir, corePublicDir], urlPath, res)) return;

      const content = routes.get(urlPath);

      if (content === undefined) {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(
          `${await layout(routes, structure, urlPath, ErrorPage, favicon, base)}`,
        );
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `${await layout(routes, structure, urlPath, content, favicon, base)}`,
      );
    },
  );

  server.listen(5151, () => {
    console.log("listening on http://localhost:5151" + base);
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
  const { routes, descriptions } = await buildPages(
    pagesDir ?? resolve("pages"),
  );
  const favicon = findFavicon(userPublicDir);
  const searchIndexJson = buildSearchIndex(routes, descriptions);

  rmSync(resolvedOut, { recursive: true, force: true });
  mkdirSync(resolvedOut, { recursive: true });
  writeFileSync(join(resolvedOut, ".nojekyll"), "");
  writeFileSync(join(resolvedOut, "search-index.json"), searchIndexJson);

  for (const dir of [corePublicDir, userPublicDir]) {
    if (existsSync(dir)) cpSync(dir, resolvedOut, { recursive: true });
  }

  for (const [route, content] of routes) {
    const dir = route === "/" ? resolvedOut : join(resolvedOut, route);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "index.html"),
      `${await layout(routes, structure, route, content, favicon, base)}`,
    );
    console.log(`  built ${route}`);
  }

  console.log(`\ndone → ${resolvedOut}`);
}
