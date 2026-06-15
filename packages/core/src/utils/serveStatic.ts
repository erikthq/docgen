import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { ServerResponse } from "node:http";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

export async function serveStatic(
  dirs: string[],
  urlPath: string,
  res: ServerResponse,
): Promise<boolean> {
  for (const dir of dirs) {
    const filePath = join(dir, urlPath);
    try {
      const stats = await stat(filePath);
      if (stats.isFile()) {
        const contentType =
          MIME_TYPES[extname(filePath)] ?? "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        res.end(await readFile(filePath));
        return true;
      }
    } catch {
      // not found or inaccessible, try next dir
    }
  }
  return false;
}
