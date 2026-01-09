import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import { OPENFLEET_DIR } from "../config";
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
