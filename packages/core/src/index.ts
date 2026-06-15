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
import { layout } from "./layout.js";
import { type NavItem } from "./components/site-header.js";
import ErrorPage from "./components/error.js";

export { html, safe };
export type { NavItem };

export interface Config {
  pagesDir?: string;
  outDir?: string;
  base?: string;
  structure?: NavItem[];
  githubLink?: string;
}

const corePublicDir = fileURLToPath(new URL("../public", import.meta.url));

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

async function buildPages(pagesDir: string) {
  const files = await scanPages(pagesDir, pagesDir);

  const entries = await Promise.all(
    files.map(async (filePath) => {
      const ext = extname(filePath);
      const route = fileToRoute(filePath, pagesDir);
      if (ext === ".md") {
        const parsed = await parseMarkdown(await readFile(filePath, "utf-8"));
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
  githubLink,
}: Config = {}) {
  const base = rawBase ? `/${rawBase.replace(/^\/|\/$/g, "")}` : "";
  const userPublicDir = resolve("public");
  console.log("building pages...");
  const { routes, descriptions } = await buildPages(
    pagesDir ?? resolve("pages"),
  );
  console.log("building search index...");
  const favicon = await findFavicon(userPublicDir);
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

      if (await serveStatic([userPublicDir, corePublicDir], urlPath, res)) return;

      const content = routes.get(urlPath);

      if (content === undefined) {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(
          `${await layout(routes, structure, urlPath, ErrorPage, favicon, base, githubLink)}`,
        );
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `${await layout(routes, structure, urlPath, content, favicon, base, githubLink)}`,
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
  githubLink,
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
  const favicon = await findFavicon(userPublicDir);
  const searchIndexJson = buildSearchIndex(routes, descriptions);

  await rm(resolvedOut, { recursive: true, force: true });
  await mkdir(resolvedOut, { recursive: true });
  await writeFile(join(resolvedOut, ".nojekyll"), "");
  await writeFile(join(resolvedOut, "search-index.json"), searchIndexJson);

  for (const dir of [corePublicDir, userPublicDir]) {
    if (await pathExists(dir)) await cp(dir, resolvedOut, { recursive: true });
  }

  for (const [route, content] of routes) {
    const dir = route === "/" ? resolvedOut : join(resolvedOut, route);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "index.html"),
      `${await layout(routes, structure, route, content, favicon, base, githubLink)}`,
    );
    console.log(`  built ${route}`);
  }

  console.log(`\ndone → ${resolvedOut}`);
}
