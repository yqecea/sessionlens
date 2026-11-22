import { asString, isRecord, pickUsage, truncate } from "./shared";
import type { SessionEvent, SessionFormat } from "./types";

/**
 * Hermes agent traces are JSONL where each line names an `event` (a `type`
 * field is accepted as an alias). Supported shapes:
 *
 *   {"event":"user_message","text":"..."}
 *   {"event":"assistant_message","text":"...","model":"..."}
 *   {"event":"llm_call","model":"...",
 *      "usage":{"prompt_tokens":n,"completion_tokens":n}}
 *   {"event":"tool_call","name":"...","args":{...}}
 *   {"event":"tool_result","name":"...","is_error":false,"output":"..."}
 *   {"event":"error","message":"..."}
 */
export function parseHermes(lines: string[]): {
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
    const event = asString(record.event) ?? asString(record.type);
    const timestamp = asString(record.timestamp) ?? asString(record.ts);
    const model = asString(record.model);
    const usage = pickUsage(record.usage);

    switch (event) {
      case "user_message":
      case "user": {
        const body = asString(record.text) ?? asString(record.message) ?? "";
        push({
          kind: "user",
          line,
          timestamp,
          model: null,
          label: truncate(body || "user message", 120),
          detail: body,
          toolName: null,
          usage: null,
        });
        return;
      }
      case "assistant_message":
      case "llm_call": {
        const body = asString(record.text) ?? asString(record.message) ?? "";
        push({
          kind: "assistant",
          line,
          timestamp,
          model,
          label: truncate(body || "assistant turn", 120),
          detail: body || JSON.stringify(record.usage ?? {}, null, 2),
          toolName: null,
          usage,
        });
        return;
      }
      case "tool_call": {
        const name = asString(record.name) ?? "tool";
        push({
          kind: "tool",
          line,
          timestamp,
          model,
          label: name,
          detail: JSON.stringify(record.args ?? record.input ?? {}, null, 2),
          toolName: name,
          usage: null,
        });
        return;
      }
      case "tool_result": {
        const name = asString(record.name);
        const isError = record.is_error === true || record.error === true;
        const body =
          asString(record.output) ??
          asString(record.result) ??
          asString(record.message) ??
          "";
        push({
          kind: isError ? "error" : "tool",
          line,
          timestamp,
          model: null,
          label: `${name ?? "tool"} result${isError ? " (error)" : ""}`,
          detail: body,
          toolName: name,
          usage: null,
        });
        return;
      }
      case "error": {
        const message = asString(record.message) ?? text;
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
      default:
        skippedLines += 1;
    }
  });

  return { events, parseFailures, skippedLines, format: "hermes" };
}
