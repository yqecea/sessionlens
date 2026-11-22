import { parseClaudeCode } from "./claude-code";
import { parseCodex } from "./codex";
import { parseHermes } from "./hermes";
import { detectFormat } from "./detect";
import type { ParseResult } from "./types";

export * from "./types";

/**
 * Parse raw transcript text into a normalized event list. Never throws:
 * malformed lines are counted and skipped so a truncated paste still yields
 * a usable session.
 */
export function parseSession(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const totalLines = lines.filter((line) => line.trim().length > 0).length;
  const format = detectFormat(lines);
  const parser =
    format === "codex"
      ? parseCodex
      : format === "hermes"
        ? parseHermes
        : parseClaudeCode;
  const result = parser(lines);
  return {
    format,
    events: result.events,
    parseFailures: result.parseFailures,
    skippedLines: result.skippedLines,
    totalLines,
  };
}
