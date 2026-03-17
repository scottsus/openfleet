import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import { version } from "../../package.json";
import { OPENFLEET_DIR, PATHS } from "../config";
import { logger } from "../logger";

const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "templates",
  ".openfleet",
);

export function initializeDirectories(): void {
  if (fs.existsSync(OPENFLEET_DIR)) {
    return;
  }

  copyDirectorySync(TEMPLATES_DIR, OPENFLEET_DIR);
  logger.info("Initialized .openfleet directory");
}

export function checkMigrationNeeded(): boolean {
  if (!fs.existsSync(OPENFLEET_DIR)) return false;
  if (!fs.existsSync(PATHS.versionFile)) return true;
  const installedVersion = fs.readFileSync(PATHS.versionFile, "utf-8").trim();
  return installedVersion !== version;
}

function copyDirectorySync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);

    const destName = entry.name === "gitignore.template" ? ".gitignore" : entry.name;
    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
