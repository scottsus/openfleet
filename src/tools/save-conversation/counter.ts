import * as fs from "fs";
import * as path from "path";

import { PATHS } from "../../config";
import { logger } from "../../logger";

const SESSIONS_DIR = PATHS.sessions;
const MAX_COUNTER = 999;

const FILENAME_PATTERN = /^(\d{3})_(.+)\.md$/;

/**
 * Gets the next counter for a given date.
 *
 * This function:
 * 1. looks inside the date subdirectory (sessions/YYYY-MM-DD/)
 * 2. extracts all counters from files matching NNN_slug.md pattern
 * 3. finds the highest counter
 * 4. returns next counter (highest + 1), zero-padded to 3 digits
 *
 * Example:
 *   >>> const counter = await getNextCounter("2025-12-23");
 *   >>> counter
 *   '003'
 */
export async function getNextCounter(date: string): Promise<string> {
  try {
    const dateDir = path.join(SESSIONS_DIR, date);
    ensureDateDir(dateDir);

    const files = fs.readdirSync(dateDir);

    const counters = files
      .map((file) => parseFilename(file))
      .filter((parsed) => parsed !== null)
      .map((parsed) => parsed!.counter);

    const highestCounter = counters.length > 0 ? Math.max(...counters) : 0;

    const nextCounter = highestCounter + 1;
    if (nextCounter > MAX_COUNTER) {
      logger.warn("Counter overflow detected", { date, counter: nextCounter });
      return String(MAX_COUNTER).padStart(3, "0");
    }

    const result = String(nextCounter).padStart(3, "0");
    return result;
  } catch (error) {
    logger.error("Failed to calculate counter, defaulting to 001", error);
    return "001";
  }
}

function parseFilename(filename: string): { counter: number; slug: string } | null {
  const match = filename.match(FILENAME_PATTERN);
  if (!match) return null;

  const [, counterStr, slug] = match;
  const counter = parseInt(counterStr, 10);

  if (isNaN(counter) || counter < 1 || counter > MAX_COUNTER) {
    return null;
  }

  return { counter, slug };
}

function ensureDateDir(dateDir: string): void {
  if (!fs.existsSync(dateDir)) {
    fs.mkdirSync(dateDir, { recursive: true });
  }
}

/**
 * Gets current date in YYYY-MM-DD format (UTC).
 */
export function getCurrentDate(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Validates date format (YYYY-MM-DD).
 */
export function isValidDateFormat(date: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(date)) return false;

  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Gets all session files for a specific date.
 */
export function getSessionsForDate(date: string): string[] {
  const dateDir = path.join(SESSIONS_DIR, date);

  if (!fs.existsSync(dateDir)) {
    return [];
  }

  const files = fs.readdirSync(dateDir);
  return files.filter((file) => parseFilename(file) !== null).sort();
}

/**
 * Builds filename from counter and slug (NNN_slug.md format).
 */
export function buildFilename(counter: string, slug: string): string {
  if (!/^\d{3}$/.test(counter)) {
    throw new Error(`Invalid counter format: ${counter}`);
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Invalid slug format: ${slug}`);
  }

  return `${counter}_${slug}.md`;
}
