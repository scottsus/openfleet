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

const BUNDLED_MIGRATIONS_DIR = path.join(TEMPLATES_DIR, "migrations");

export function initializeDirectories(): void {
  if (fs.existsSync(OPENFLEET_DIR)) {
    return;
  }

  copyDirectorySync(TEMPLATES_DIR, OPENFLEET_DIR);
  stampVersion();
  logger.info("Initialized .openfleet directory");
}

/**
 * Returns pending migration versions between the installed VERSION and current package version.
 *
 * Scans the bundled templates migrations dir (not runtime .openfleet/migrations/)
 * since pre-0.4.0 installs won't have a migrations/ folder at all.
 */
export function getPendingMigrations(): string[] {
  if (!fs.existsSync(OPENFLEET_DIR)) return [];
  if (!fs.existsSync(BUNDLED_MIGRATIONS_DIR)) return [];

  const installedVersion = readInstalledVersion();

  return fs
    .readdirSync(BUNDLED_MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .filter((v) => compareSemver(v, installedVersion) > 0 && compareSemver(v, version) <= 0)
    .sort(compareSemver);
}

export function stampVersion(): void {
  fs.writeFileSync(PATHS.versionFile, version);
}

function readInstalledVersion(): string {
  if (!fs.existsSync(PATHS.versionFile)) return "0.0.0";

  const raw = fs.readFileSync(PATHS.versionFile, "utf-8").trim();
  const parts = raw.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "0.0.0";

  return raw;
}

// NOTE: Does not handle pre-release versions (e.g. 0.4.0-beta.1).
// If pre-release support is ever needed, use a proper semver library.
function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
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
