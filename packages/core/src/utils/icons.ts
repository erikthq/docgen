import { safe, SafeHtml } from "#html";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";

const TABLER_CDN = "https://cdn.jsdelivr.net/npm/@tabler/icons/icons";
const cachePath = resolve("node_modules/.cache/docgen/icons.json");

const memCache: Record<string, string> = {};

async function readCache(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(cachePath, "utf-8"));
  } catch {
    return {};
  }
}

export async function icon(name: string): Promise<SafeHtml> {
  if (memCache[name]) return safe(memCache[name]);

  const diskCache = await readCache();
  if (diskCache[name]) {
    memCache[name] = diskCache[name];
    return safe(diskCache[name]);
  }

  const res = await fetch(`${TABLER_CDN}/${name}.svg`);
  const svg = res.ok ? await res.text() : "";

  memCache[name] = svg;

  const latest = await readCache();
  latest[name] = svg;
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(latest));

  return safe(svg);
}
