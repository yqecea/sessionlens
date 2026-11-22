import { asString, isRecord, pickUsage, textFrom, truncate } from "./shared";
import type { SessionEvent, SessionFormat } from "./types";

const KNOWN_TYPES = new Set([
  "user",
  "assistant",
  "summary",
  "system",
  "file-history-snapshot",
  "queue-operation",
]);

/**
 * Claude Code session transcripts are JSONL where each line has a top level
 * `type` field. Relevant shapes:
 *
 *   {"type":"user","message":{"role":"user","content":"..."|blocks}}
 *   {"type":"assistant","message":{"model":"...","content":[blocks],
 *      "usage":{"input_tokens":n,"output_tokens":n,
 *               "cache_read_input_tokens":n,"cache_creation_input_tokens":n}}}
 *   {"type":"summary","summary":"..."}
 *   {"type":"system","subtype":"..."}
 *
 * `content` blocks of `tool_use` emit tool events. `tool_result` blocks inside
 * user lines close the pair and emit error events when `is_error` is set.
 */
export function parseClaudeCode(lines: string[]): {
  events: SessionEvent[];
  parseFailures: number;
  skippedLines: number;
  format: SessionFormat;
} {
  const events: SessionEvent[] = [];
  const toolNames = new Map<string, string>();
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
    const message = isRecord(record.message) ? record.message : null;
    const model = message ? asString(message.model) : asString(record.model);
    const usage = message ? pickUsage(message.usage) : pickUsage(record.usage);

    if (type === "assistant" && message) {
      const content = Array.isArray(message.content) ? message.content : [];
      const text = textFrom(message.content);
      push({
        kind: "assistant",
        line,
        timestamp,
        model,
        label: truncate(text || "assistant turn", 120),
        detail: text,
        toolName: null,
        usage,
      });
      for (const block of content) {
        if (!isRecord(block) || block.type !== "tool_use") continue;
        const name = asString(block.name) ?? "tool";
        const id = asString(block.id);
        if (id) toolNames.set(id, name);
        push({
          kind: "tool",
          line,
          timestamp,
          model,
          label: name,
          detail: JSON.stringify(block.input ?? {}, null, 2),
          toolName: name,
          usage: null,
        });
      }
      return;
    }

    if (type === "user" && message) {
      const content = message.content;
      const toolResults = Array.isArray(content)
        ? content.filter(
            (b): b is Record<string, unknown> =>
              isRecord(b) && b.type === "tool_result",
          )
        : [];
      if (toolResults.length > 0) {
        for (const result of toolResults) {
          const toolUseId = asString(result.tool_use_id);
          const name = toolUseId ? toolNames.get(toolUseId) ?? null : null;
          const isError = result.is_error === true;
          const body = textFrom(result.content);
          push({
            kind: isError ? "error" : "tool",
            line,
            timestamp,
            model: null,
            label: name ? `${name} result${isError ? " (error)" : ""}` : "tool result",
            detail: body || JSON.stringify(result.content ?? ""),
            toolName: name,
            usage: null,
          });
        }
        return;
      }
      const text = textFrom(content);
      push({
        kind: "user",
        line,
        timestamp,
        model: null,
        label: truncate(text || "user turn", 120),
        detail: text,
        toolName: null,
        usage: null,
      });
      return;
    }

    if (type === "summary") {
      const summary = asString(record.summary) ?? "";
      push({
        kind: "summary",
        line,
        timestamp,
        model: null,
        label: truncate(summary || "summary", 120),
        detail: summary,
        toolName: null,
        usage: null,
      });
      return;
    }

    if (type === "system") {
      const subtype = asString(record.subtype) ?? "system";
      push({
        kind: "system",
        line,
        timestamp,
        model,
        label: `system: ${subtype}`,
        detail: JSON.stringify(record, null, 2),
        toolName: null,
        usage,
      });
      return;
    }

    if (type && KNOWN_TYPES.has(type)) {
      skippedLines += 1;
      return;
    }
    skippedLines += 1;
  });

  return { events, parseFailures, skippedLines, format: "claude-code" };
}
