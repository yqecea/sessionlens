import { asString, isRecord, pickUsage, textFrom, truncate } from "./shared";
import type { SessionEvent, SessionFormat } from "./types";

/**
 * Codex CLI writes session rollouts as JSONL. The shapes this parser reads:
 *
 *   {"type":"response_item","payload":{"type":"message","role":"user",
 *      "content":[{"type":"input_text","text":"..."}]}}
 *   {"type":"response_item","payload":{"type":"function_call",
 *      "name":"shell","arguments":"{...}"}}
 *   {"type":"event_msg","payload":{"type":"token_count",
 *      "info":{"total_token_usage":{"input_tokens":n,"output_tokens":n,
 *              "cached_input_tokens":n}}}}
 *   {"type":"turn_context","payload":{...}}        (ignored)
 *   {"type":"session_meta","payload":{...}}        (ignored)
 *
 * A bare {"type":"token_count","usage":{...}} line is also accepted, which
 * covers simplified exports. Token counts are reported as assistant events
 * so per turn usage still lands on the timeline.
 */
export function parseCodex(lines: string[]): {
  events: SessionEvent[];
  parseFailures: number;
  skippedLines: number;
  format: SessionFormat;
} {
  const events: SessionEvent[] = [];
  let parseFailures = 0;
  let skippedLines = 0;

  const push = (event: Omit<SessionEvent, "index">) => {
    events.push({ ...event, index: events.length });
  };

  lines.forEach((raw, i) => {
    const line = i + 1;
    const text = raw.trim();
    if (!text) return;
    let record: unknown;
    try {
      record = JSON.parse(text);
    } catch {
      parseFailures += 1;
      return;
    }
    if (!isRecord(record)) {
      skippedLines += 1;
      return;
    }
    const type = asString(record.type);
    const timestamp = asString(record.timestamp);
    const payload = isRecord(record.payload) ? record.payload : null;

    if (type === "response_item" && payload) {
      const kind = asString(payload.type);
      if (kind === "message") {
        const role = asString(payload.role) ?? "assistant";
        const text = textFrom(payload.content);
        push({
          kind: role === "user" ? "user" : "assistant",
          line,
          timestamp,
          model: asString(payload.model) ?? asString(record.model),
          label: truncate(text || `${role} message`, 120),
          detail: text,
          toolName: null,
          usage: pickUsage(payload.usage) ?? pickUsage(record.usage),
        });
        return;
      }
      if (
        kind === "function_call" ||
        kind === "local_shell_call" ||
        kind === "custom_tool_call"
      ) {
        const name = asString(payload.name) ?? kind;
        const args = asString(payload.arguments) ?? JSON.stringify(payload);
        push({
          kind: "tool",
          line,
          timestamp,
          model: null,
          label: name,
          detail: args,
          toolName: name,
          usage: null,
        });
        return;
      }
      skippedLines += 1;
      return;
    }

    if (type === "event_msg" && payload) {
      const kind = asString(payload.type);
      if (kind === "token_count") {
        const info = isRecord(payload.info) ? payload.info : payload;
        const usage =
          pickUsage(isRecord(info.last_token_usage) ? info.last_token_usage : null) ??
          pickUsage(isRecord(info.total_token_usage) ? info.total_token_usage : null) ??
          pickUsage(info);
        push({
          kind: "assistant",
          line,
          timestamp,
          model: asString(payload.model) ?? asString(record.model),
          label: "token usage report",
          detail: JSON.stringify(info, null, 2),
          toolName: null,
          usage,
        });
        return;
      }
      if (kind === "error" || kind === "agent_error") {
        const message = asString(payload.message) ?? JSON.stringify(payload);
        push({
          kind: "error",
          line,
          timestamp,
          model: null,
          label: truncate(message, 120),
          detail: message,
          toolName: null,
          usage: null,
        });
        return;
      }
      skippedLines += 1;
      return;
    }

    if (type === "token_count") {
      push({
        kind: "assistant",
        line,
        timestamp,
        model: asString(record.model),
        label: "token usage report",
        detail: text,
        toolName: null,
        usage: pickUsage(record.usage) ?? pickUsage(record),
      });
      return;
    }

    skippedLines += 1;
  });

  return { events, parseFailures, skippedLines, format: "codex" };
}
