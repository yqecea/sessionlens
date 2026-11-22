import { asString, isRecord } from "./shared";
import type { SessionFormat } from "./types";

const CLAUDE_TYPES = new Set(["user", "assistant", "summary", "system"]);
const CODEX_TYPES = new Set([
  "response_item",
  "event_msg",
  "turn_context",
  "session_meta",
  "token_count",
]);

/**
 * Sniff the transcript format by scoring the first parseable lines.
 * Claude Code lines carry a `message` object under a user/assistant type.
 * Codex lines wrap records in `payload` or use response_item/event_msg types.
 * Hermes lines name their record with an `event` field.
 */
export function detectFormat(lines: string[]): SessionFormat {
  const scores: Record<Exclude<SessionFormat, "unknown">, number> = {
    "claude-code": 0,
    codex: 0,
    hermes: 0,
  };
  let inspected = 0;
  for (const raw of lines) {
    if (inspected >= 40) break;
    const text = raw.trim();
    if (!text) continue;
    let record: unknown;
    try {
      record = JSON.parse(text);
    } catch {
      continue;
    }
    if (!isRecord(record)) continue;
    inspected += 1;
    const type = asString(record.type);
    if (record.event !== undefined) {
      scores.hermes += 2;
      continue;
    }
    if (record.payload !== undefined || (type && CODEX_TYPES.has(type))) {
      scores.codex += 2;
      continue;
    }
    if (type && CLAUDE_TYPES.has(type) && record.message !== undefined) {
      scores["claude-code"] += 2;
      continue;
    }
    if (type && CLAUDE_TYPES.has(type)) {
      scores["claude-code"] += 1;
      continue;
    }
    if (type && CODEX_TYPES.has(type)) scores.codex += 1;
  }
  const best = (Object.entries(scores) as [SessionFormat, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0];
  return best && best[1] > 0 ? best[0] : "unknown";
}
