#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildDocs } from "./index.js";

const command = process.argv[2];
const configPath = resolve("docs.config.ts");

if (command === "dev") {
  const coreSrc = resolve(import.meta.dirname, "..", "src");
  const watchArgs = existsSync(coreSrc) ? [`--watch-path=${coreSrc}`] : [];
  spawn("node", ["--watch", "--watch-path=./pages", ...watchArgs, configPath], { stdio: "inherit" });
} else if (command === "build") {
  const { default: configPromise } = await import(pathToFileURL(configPath).href);
  const config = await configPromise;
  await buildDocs(config);
} else {
  console.error("Usage: docgen <dev|build>");
  process.exit(1);
}
