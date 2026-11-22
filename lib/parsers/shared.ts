import type { TokenUsage } from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function firstNumber(
  obj: Record<string, unknown>,
  keys: string[],
): number {
  for (const key of keys) {
    if (key in obj) {
      const n = asNumber(obj[key]);
      if (n !== 0) return n;
      if (typeof obj[key] === "number") return 0;
    }
  }
  return 0;
}

const INPUT_KEYS = ["input_tokens", "prompt_tokens", "inputTokens"];
const OUTPUT_KEYS = ["output_tokens", "completion_tokens", "outputTokens"];
const CACHE_READ_KEYS = [
  "cache_read_input_tokens",
  "cached_input_tokens",
  "cache_read_tokens",
  "cacheRead",
];
const CACHE_WRITE_KEYS = [
  "cache_creation_input_tokens",
  "cache_creation_tokens",
  "cache_write_tokens",
  "cacheWrite",
];

/**
 * Extract token usage from a loosely shaped object. Returns null when the
 * object carries no usage fields at all, so empty usage and absent usage
 * stay distinguishable.
 */
export function pickUsage(value: unknown): TokenUsage | null {
  if (!isRecord(value)) return null;
  const known = [
    ...INPUT_KEYS,
    ...OUTPUT_KEYS,
    ...CACHE_READ_KEYS,
    ...CACHE_WRITE_KEYS,
    "total_tokens",
  ];
  if (!known.some((key) => key in value)) return null;
  return {
    input: firstNumber(value, INPUT_KEYS),
    output: firstNumber(value, OUTPUT_KEYS),
    cacheRead: firstNumber(value, CACHE_READ_KEYS),
    cacheWrite: firstNumber(value, CACHE_WRITE_KEYS),
  };
}

/** Pull display text out of string content or an array of content blocks. */
export function textFrom(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (!isRecord(block)) continue;
      if (typeof block.text === "string") parts.push(block.text);
      else if (typeof block.content === "string") parts.push(block.content);
    }
    return parts.join("\n");
  }
  return "";
}

export function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}
