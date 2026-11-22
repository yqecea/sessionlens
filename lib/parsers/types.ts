export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export type EventKind =
  | "user"
  | "assistant"
  | "tool"
  | "error"
  | "summary"
  | "system";

export interface SessionEvent {
  /** Position in the parsed event stream. */
  index: number;
  kind: EventKind;
  /** Raw line number in the source file, 1 based. */
  line: number;
  timestamp: string | null;
  model: string | null;
  /** Short label shown in the timeline. */
  label: string;
  /** Longer text shown in the detail pane. */
  detail: string;
  toolName: string | null;
  usage: TokenUsage | null;
}

export type SessionFormat = "claude-code" | "codex" | "hermes" | "unknown";

export interface ParseResult {
  format: SessionFormat;
  events: SessionEvent[];
  /** Non blank lines that were not valid JSON. */
  parseFailures: number;
  /** Valid JSON lines with a shape the parser does not know. */
  skippedLines: number;
  totalLines: number;
}

export const ZERO_USAGE: TokenUsage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

export function usageTotal(usage: TokenUsage | null): number {
  if (!usage) return 0;
  return usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
}

/** Tokens that occupy the context window for a turn. */
export function contextTokens(usage: TokenUsage | null): number {
  if (!usage) return 0;
  return usage.input + usage.cacheRead + usage.cacheWrite;
}
